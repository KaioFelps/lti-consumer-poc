import { type UUID } from "common/src/types/uuid.js";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error.js";

export class StudentNotFoundError extends PersonNotFoundError {
  public constructor(studentId: UUID) {
    super(studentId.toString());
    this._errorMessageIdentifier = "grading:errors:student-not-found";
  }
}
