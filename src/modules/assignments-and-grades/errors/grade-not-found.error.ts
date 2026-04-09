import { type UUID } from "common/src/types/uuid";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { Person } from "@/modules/identity/person/person.entity";
import { Assignment } from "../entities/assignment.entity";

export class GradeNotFoundError extends ResourceNotFoundError {
  public constructor(assignment: UUID | Assignment, student: UUID | Person) {
    const messageParams: Record<string, string> = {};

    if (assignment instanceof Assignment) messageParams.assignmentTitle = assignment.getTitle();
    else messageParams.assignmentId = assignment.toString();

    if (student instanceof Person) messageParams.studentName = student.getName();
    else messageParams.studentId = student.toString();

    super({
      errorMessageIdentifier: "grading:assignments-repository:errors:grade-not-found",
      messageParams,
    });
  }
}
