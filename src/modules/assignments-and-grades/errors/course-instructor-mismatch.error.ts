import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";

export class CourseInstructorMismatch extends UnauthorizedError {
  public constructor(course: Course, instructor: Instructor) {
    super({
      errorMessageIdentifier: "grading:errors:instructor-unauthorized-in-course",
      messageParams: { instructorName: instructor.getName(), courseTitle: course.getTitle() },
    });
  }
}
