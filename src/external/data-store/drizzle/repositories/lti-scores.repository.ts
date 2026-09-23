import { Injectable } from "@nestjs/common";
import { ltiScoresT } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ScoreNotFoundError } from "@/modules/lti/ags/errors/score-not-found.error";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { LtiScoresRepository } from "$/assignment-and-grade/repositories";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { DrizzleClient } from "../client";
import scoresMapper from "../mappers/scores.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

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
}
