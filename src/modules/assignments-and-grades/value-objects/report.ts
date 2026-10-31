import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { Enrollment } from "@/modules/courses-and-enrollments/entities/enrollment.entity.js";
import { Person } from "@/modules/identity/person/person.entity.js";
import { GradeOfAssignment } from "../aggregates/grade-of-assignment.aggregate.js";

interface IReport {
  course: Course;
  student: Person;
  enrollment: Enrollment;
  grades: GradeOfAssignment[];
}

export class Report implements IReport {
  public constructor(
    public readonly course: Course,
    public readonly student: Person,
    public readonly enrollment: Enrollment,
    public readonly grades: GradeOfAssignment[],
  ) {}
}
