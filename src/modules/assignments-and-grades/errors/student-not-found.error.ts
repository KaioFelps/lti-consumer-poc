import { type UUID } from "common/src/types/uuid";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error";

export class StudentNotFoundError extends PersonNotFoundError {
  public constructor(studentId: UUID) {
    super(studentId.toString());
    this._errorMessageIdentifier = "grading:errors:student-not-found";
  }
}
