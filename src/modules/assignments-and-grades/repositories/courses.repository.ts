import { type UUID } from "common/src/types/uuid";
import { type Either } from "fp-ts/lib/Either";
import { type IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { CourseWithInstructor } from "@/modules/courses-and-enrollments/aggregates/course-with-instructor.aggregate";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { CourseNotFoundError } from "../errors/course-not-found.error";

export abstract class CoursesRepository {
  public abstract findById(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError | CourseNotFoundError, Course>>;

  public abstract save(course: Course): Promise<Either<IrrecoverableError, Course>>;

  public abstract findManyCoursesWithInstructors(): Promise<
    Either<IrrecoverableError, CourseWithInstructor[]>
  >;

  public abstract findCourseWithInstructorById(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError | CourseNotFoundError, CourseWithInstructor>>;
}
