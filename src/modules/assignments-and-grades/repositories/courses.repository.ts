import { type UUID } from "common/src/types/uuid";
import { type Either } from "fp-ts/lib/Either";
import { type IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { CourseNotFoundError } from "../errors/course-not-found.error";

export abstract class CoursesRepository {
  public abstract findById(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError | CourseNotFoundError, Course>>;
}
