import { UUID } from "common/src/types/uuid";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";

export class CourseInstructorMismatch extends UnauthorizedError {
  public constructor(course: Course, instructor: Instructor | UUID) {
    const instructorParams =
      instructor instanceof Instructor
        ? { instructorName: instructor.getName() }
        : { instructorId: instructor.toString() };

    super({
      errorMessageIdentifier: "grading:errors:instructor-unauthorized-in-course",
      messageParams: { ...instructorParams, courseTitle: course.getTitle() },
    });
  }
}
