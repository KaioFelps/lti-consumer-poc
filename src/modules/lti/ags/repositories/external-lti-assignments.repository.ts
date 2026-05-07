import type { Either } from "fp-ts/lib/Either";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import type { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import type { LtiResourceLink } from "$/core/resource-link";

export abstract class ExternalLtiAssignmentsRepository {
  public abstract makeAssignmentExternal(
    assignment: Assignment,
    resourceLink: LtiResourceLink,
  ): Promise<Either<IrrecoverableError, void>>;
}
