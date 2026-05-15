import { Injectable } from "@nestjs/common";
import { assignmentsT, ltiAssignmentsT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { ExternalLtiAssignmentsRepository } from "@/modules/lti/ags/repositories/external-lti-assignments.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { DrizzleClient } from "../client";
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
}
