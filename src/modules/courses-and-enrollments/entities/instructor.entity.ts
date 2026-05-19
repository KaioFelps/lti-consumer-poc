import { either as e } from "fp-ts";
import { EntityBase } from "@/core/entity-base";
import { Person } from "@/modules/identity/person/person.entity";
import { SystemRole } from "@/modules/identity/user/enums/system-role";
import { CourseWithInstructor } from "../aggregates/course-with-instructor.aggregate";
import { NotAnInstructorError } from "../errors/not-an-instructor";
import { Course } from "./course.entity";

type Props = {
  person: Person;
};

type CreateCourseParams = Omit<Course.ConstructorProps, "instructorId">;

export class Instructor extends EntityBase<Props> {
  public static create({ person }: Props) {
    if (person.getUser().getSystemRole() !== SystemRole.Admin) {
      return e.left(new NotAnInstructorError(person));
    }

    return e.right(new Instructor({ person }));
  }

  public static createUnchecked({ person }: Props) {
    return new Instructor({ person });
  }

  public createCourse({ title }: CreateCourseParams) {
    const course = Course.create({ instructorId: this.getId(), title });
    return CourseWithInstructor.create({ instructor: this, course });
  }

  public getPerson() {
    return this.props.person;
  }

  public getId() {
    return this.props.person.getUser().getId();
  }

  public getName() {
    return this.props.person.getName();
  }
}
