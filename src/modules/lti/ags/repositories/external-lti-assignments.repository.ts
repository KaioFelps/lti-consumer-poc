import { type UUID } from "common/src/types/uuid";
import type { Either } from "fp-ts/lib/Either";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import type { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import type { LtiResourceLink } from "$/core/resource-link";
import { ExternalAssignmentNotFoundError } from "../errors/external-assignment-not-found.error";

export abstract class ExternalLtiAssignmentsRepository {
  public abstract makeAssignmentExternal(
    assignment: Assignment,
    resourceLink: LtiResourceLink,
  ): Promise<Either<IrrecoverableError, void>>;

  public abstract findCompleteExternalLtiAssignmentById(
    assignmentId: UUID,
  ): Promise<
    Either<
      IrrecoverableError | ExternalAssignmentNotFoundError,
      { assignment: Assignment; resourceLink: LtiResourceLink }
    >
  >;
}
