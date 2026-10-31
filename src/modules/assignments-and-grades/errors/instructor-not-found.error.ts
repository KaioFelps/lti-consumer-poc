import { type UUID } from "common/src/types/uuid.js";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error.js";

export class InstructorNotFoundError extends PersonNotFoundError {
  public constructor(instructorId: UUID) {
    super(instructorId.toString());
    this._errorMessageIdentifier = "grading:errors:instructor-not-found";
  }
}
