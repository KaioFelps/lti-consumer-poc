import { Injectable } from "@nestjs/common";
import { ltiAssignmentsT } from "drizzle/schema";
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
        () =>
          client.insert(ltiAssignmentsT).values({
            assignment_id: assignment.getId().toString(),
            resourceLinkId: resourceLink.id,
          }),
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
