import { Person } from "@/modules/identity/person/person.entity.js";
import { CourseWithInstructor } from "../aggregates/course-with-instructor.aggregate.js";
import { Enrollment } from "../entities/enrollment.entity.js";

interface IFullEnrollment {
  enrollment: Enrollment;
  student: Person;
  course: CourseWithInstructor;
}

export class FullEnrollment implements IFullEnrollment {
  public constructor(
    public readonly enrollment: Enrollment,
    public readonly student: Person,
    public readonly course: CourseWithInstructor,
  ) {}
}
