import { type UUID } from "common/src/types/uuid";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class AssignmentNotFoundError extends ResourceNotFoundError {
  public constructor(assignmentId: UUID) {
    super({
      errorMessageIdentifier: "grading:assignments-repository:errors:assignment-not-found",
      messageParams: { personId: assignmentId.toString() },
    });
  }
}
