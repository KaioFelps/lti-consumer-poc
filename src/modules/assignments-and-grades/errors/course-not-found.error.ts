import { type UUID } from "common/src/types/uuid";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class CourseNotFoundError extends ResourceNotFoundError {
  public constructor(courseId: UUID) {
    super({
      errorMessageIdentifier: "grading:courses-repository:errors:not-found",
      messageParams: { courseId: courseId.toString() },
    });
  }
}
