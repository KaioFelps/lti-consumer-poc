import { Person } from "@/modules/identity/person/person.entity";
import { CourseWithInstructor } from "../aggregates/course-with-instructor.aggregate";
import { Enrollment } from "../entities/enrollment.entity";

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
