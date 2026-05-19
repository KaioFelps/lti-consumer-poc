import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { assignmentsT, ltiAssignmentsT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { ExternalAssignmentNotFoundError } from "@/modules/lti/ags/errors/external-assignment-not-found.error";
import { ExternalLtiAssignmentsRepository } from "@/modules/lti/ags/repositories/external-lti-assignments.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { DrizzleClient } from "../client";
import assignmentsMapper from "../mappers/assignments.mapper";
import ltiResourceLinksMapper from "../mappers/lti-resource-links.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleExternalLtiAssignmentsRepository extends ExternalLtiAssignmentsRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly txManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public makeAssignmentExternal(
    assignment: Assignment,
    resourceLink: LtiResourceLink,
  ): Promise<Either<IrrecoverableError, void>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.tryCatch(
        async () => {
          // yes, drizzle _does_ support nested transactions (in case client is already a transaction ATP)
          // see: https://orm.drizzle.team/docs/transactions
          return client.transaction(async (tx) => {
            const data = await tx.insert(ltiAssignmentsT).values({
              assignmentId: assignment.getId().toString(),
              resourceLinkId: resourceLink.id,
            });

            await tx
              .update(assignmentsT)
              .set({ kind: "external_lti" })
              .where(eq(assignmentsT.id, assignment.getId().toString()));

            return data;
          });
        },
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleExternalLtiAssignmentsRepository.name} when ` +
              "trying to create an lti assignment tuple",
            error as Error,
          ),
      ),
      te.map(() => {}),
    )();
  }

  public findCompleteExternalLtiAssignmentById(assignmentId: UUID) {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.tryCatch(
        () =>
          client.query.ltiAssignmentsT.findFirst({
            columns: { assignmentId: false, resourceLinkId: false },
            with: {
              assignmemnt: assignmentsMapper.requiredQueryConfig,
              resourceLink: ltiResourceLinksMapper.requiredQueryConfig,
            },
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleExternalLtiAssignmentsRepository.name} when ` +
              `finding complete external LTI assignment by id "${assignmentId}".`,
            error as Error,
          ),
      ),
      te.chainEitherKW((row) => {
        if (!row) return e.left(new ExternalAssignmentNotFoundError(assignmentId));
        return e.right({
          assignment: assignmentsMapper.fromRow(row.assignmemnt),
          resourceLink: ltiResourceLinksMapper.fromRow(row.resourceLink),
        });
      }),
    )();
  }
}
