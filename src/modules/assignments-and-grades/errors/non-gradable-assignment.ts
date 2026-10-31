import { BadRequestError } from "@/core/errors/bad-request.error.js";
import { Assignment } from "../entities/assignment.entity.js";

export class NonGradableAssignmentError extends BadRequestError {
  public constructor(assignment: Assignment) {
    super({
      errorMessageIdentifier: "grading:errors:assignment-not-gradable",
      messageParams: { title: assignment.getTitle() },
    });
  }
}
