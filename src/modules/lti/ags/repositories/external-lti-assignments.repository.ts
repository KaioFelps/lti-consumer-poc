import { type UUID } from "common/src/types/uuid.js";
import type { Either } from "fp-ts/lib/Either.js";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import type { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity.js";
import type { LtiResourceLink } from "$/core/resource-link.js";
import { ExternalAssignmentNotFoundError } from "../errors/external-assignment-not-found.error.js";

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
