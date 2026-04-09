import { EntityBase } from "@/core/entity-base";
import { Person } from "@/modules/identity/person/person.entity";
import { Course } from "../entities/course.entity";

type Props = {
  course: Course;
  instructor: Person;
};
export class CourseWithInstructor extends EntityBase<Props> {
  public static create(props: Props) {
    return new CourseWithInstructor(props);
  }

  public getCourse() {
    return this.props.course;
  }

  public getInstructor() {
    return this.props.instructor;
  }
}
