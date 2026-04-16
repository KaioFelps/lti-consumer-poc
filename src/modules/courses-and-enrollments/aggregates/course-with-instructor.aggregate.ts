import { EntityBase } from "@/core/entity-base";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { Course } from "../entities/course.entity";
import { Instructor } from "../entities/instructor.entity";

type Props = {
  course: Course;
  instructor: Instructor;
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

  public createAssignment(params: {
    title: string;
    maxScore: number;
    deadline?: Date;
    releasedAt?: Date;
  }) {
    return Assignment.create({ ...params, courseId: this.props.course.getId() });
  }
}
