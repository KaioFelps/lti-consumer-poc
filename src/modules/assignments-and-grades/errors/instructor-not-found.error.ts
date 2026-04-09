import { type UUID } from "common/src/types/uuid";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error";

export class InstructorNotFoundError extends PersonNotFoundError {
  public constructor(instructorId: UUID) {
    super(instructorId.toString());
    this._errorMessageIdentifier = "grading:errors:instructor-not-found";
  }
}
