import { BadRequestError } from "@/core/errors/bad-request.error";
import { Assignment } from "../entities/assignment.entity";

export class NonGradableAssignmentError extends BadRequestError {
  public constructor(assignment: Assignment) {
    super({
      errorMessageIdentifier: "grading:errors:assignment-not-gradable",
      messageParams: { title: assignment.getTitle() },
    });
  }
}
