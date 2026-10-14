import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { ltiLineItemsT, ltiScoresT } from "drizzle/schema";
import { and, eq, exists, inArray, isNotNull, or, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Grade } from "@/modules/assignments-and-grades/entities/grade.entity";
import { GradeNotFoundError } from "@/modules/assignments-and-grades/errors/grade-not-found.error";
import { ScoreNotFoundError } from "@/modules/lti/ags/errors/score-not-found.error";
import { LtiScoresRepository } from "@/modules/lti/ags/repositories/lti-scores.repository";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { DrizzleClient } from "../client";
import gradesMapper from "../mappers/grades.mapper";
import scoresMapper from "../mappers/scores.mapper";
import { DrizzleTransactionManager, Transaction } from "../transaction-manager";

@Injectable()
export class DrizzleLtiScoresRepository extends LtiScoresRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly transactionManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public findByLineItemIdAndUserId(
    lineItemId: LtiLineItem["id"],
    userId: string,
  ): Promise<Either<LtiRepositoryError, LtiScore>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.tryCatch(
        () =>
          client.query.ltiScoresT.findFirst({
            where: and(
              eq(ltiScoresT.lineItemId, lineItemId.toString()),
              eq(ltiScoresT.userId, userId),
            ),
          }),
        (err) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiScoresRepository.name} when trying to find a score by line item and user IDs.`,
              err as Error,
            ),
          }),
      ),
      te.chainEitherKW((row) =>
        row
          ? e.right(row)
          : e.left(
              new LtiRepositoryError({
                type: "NotFound",
                cause: new ScoreNotFoundError(),
                subject: LtiScore.name,
              }),
            ),
      ),
      te.map(scoresMapper.fromRow),
    )();
  }

  public upsert(
    score: LtiScore,
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, void>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    const row = scoresMapper.intoRow(score, lineItemId.toString());
    const { lineItemId: _lineItemId, userId: _userId, ...fieldsToSet } = row;

    return pipe(
      te.tryCatch(
        () =>
          client
            .insert(ltiScoresT)
            .values(row)
            .onConflictDoUpdate({
              target: [ltiScoresT.userId, ltiScoresT.lineItemId],
              set: fieldsToSet,
            }),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiScoresRepository.name} when saving score for ` +
                `line item "${lineItemId}" and user "${score.userId}".`,
              error as Error,
            ),
          }),
      ),
      te.map(() => undefined),
    )();
  }

  public fetchManyByLineItemId(
    lineItemId: LtiLineItem["id"],
    limit: number,
    page: number,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiScore>>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    const offset = (page - 1) * limit;
    lineItemId = lineItemId.toString();

    // unscored records (scoreGiven being `undefined` or `null`) are excluded from
    // both the page's records and the count, so pagination stays consistent once callers
    // apply their own security filter against unscored results downstream.
    //
    // this is stated in the method's docstring
    const where = and(eq(ltiScoresT.lineItemId, lineItemId), isNotNull(ltiScoresT.scoreGiven));

    return pipe(
      te.Do,
      te.bindW("scores", () =>
        te.tryCatch(
          () =>
            client.query.ltiScoresT.findMany({
              ...scoresMapper.requiredQueryConfig,
              where,
              limit,
              offset,
            }),
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiScoresRepository.name} when fetching scores for line item "${lineItemId}".`,
                error as Error,
              ),
            }),
        ),
      ),
      te.bindW("count", () =>
        te.tryCatch(
          async () => {
            const result = await client
              .select({ count: sql<number>`count(*)` })
              .from(ltiScoresT)
              .where(where);

            return Number(result[0]?.count ?? 0);
          },
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiScoresRepository.name} when counting scores for line item "${lineItemId}".`,
                error as Error,
              ),
            }),
        ),
      ),
      te.let("mappedScores", ({ scores }) => scores.map((row) => scoresMapper.fromRow(row))),
      te.map(({ mappedScores, count }) => ({ values: mappedScores, count })),
    )();
  }

  private getBaseWhereClauseForFindingUserScore<T extends Record<string, unknown>>(
    assignmentId: UUID,
    client: Transaction | NodePgDatabase<T>,
  ) {
    return inArray(
      ltiScoresT.lineItemId,
      client
        .select({ id: ltiLineItemsT.id })
        .from(ltiLineItemsT)
        .where(
          and(
            eq(ltiLineItemsT.ltiAssignmentId, assignmentId.toString()),
            or(
              exists(
                client
                  .select({ one: sql`1` })
                  .from(ltiLineItemsT)
                  .where(eq(ltiLineItemsT.ltiAssignmentId, assignmentId.toString())),
              ),
              eq(ltiLineItemsT.manuallyChosenByInstructor, true),
            ),
          ),
        ),
    );
  }

  public findUserScoreOnAssignment(
    userId: UUID,
    assignmentId: UUID,
    courseId: UUID,
  ): Promise<Either<GradeNotFoundError | IrrecoverableError, Grade>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.query.ltiScoresT.findFirst({
            ...gradesMapper.ltiScoreRequiredQueryConfig,
            where: and(
              eq(ltiScoresT.userId, userId.toString()),
              this.getBaseWhereClauseForFindingUserScore(assignmentId, client),
            ),
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${LtiScoresRepository.name} when` +
              `trying to find the score of user "${userId}" on assignment "${assignmentId}".`,
            error as Error,
          ),
      ),
      te.chainEitherKW((row) =>
        row && row.scoreGiven !== null
          ? e.right(row)
          : e.left(new GradeNotFoundError(assignmentId, userId)),
      ),
      te.map((row) => gradesMapper.fromLtiScoreRow(assignmentId, courseId, row)),
    )();
  }

  public findUsersScoresOnAssignment(
    usersIds: UUID[],
    assignmentId: UUID,
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Grade[]>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.query.ltiScoresT.findMany({
            ...gradesMapper.ltiScoreRequiredQueryConfig,
            where: and(
              inArray(
                ltiScoresT.userId,
                usersIds.map((id) => id.toString()),
              ),
              this.getBaseWhereClauseForFindingUserScore(assignmentId, client),
            ),
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${LtiScoresRepository.name} when` +
              `trying to find the score of users whose IDs are in "${usersIds.join(", ")}" on assignment "${assignmentId}".`,
            error as Error,
          ),
      ),
      te.map((rows) => rows.filter((row) => row.scoreGiven !== null)),
      te.map((rows) =>
        rows.map((row) => gradesMapper.fromLtiScoreRow(assignmentId, courseId, row)),
      ),
    )();
  }
}
