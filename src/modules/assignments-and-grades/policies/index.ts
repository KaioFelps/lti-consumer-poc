import { either as e } from "fp-ts";
import { type Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity.js";
import { CourseInstructorMismatch } from "../errors/course-instructor-mismatch.error.js";

function instructorIsAuthorized(instructor: Instructor, course: Course) {
  if (course.isTaughtBy(instructor)) return e.right(undefined);
  return e.left(new CourseInstructorMismatch(course, instructor));
}

export default {
  instructorIsAuthorized,
};
