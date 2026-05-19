import { type UUID } from "common/src/types/uuid";
import { EntityBase } from "@/core/entity-base";
import { Person } from "@/modules/identity/person/person.entity";
import { Course } from "./course.entity";

type Props = {
  studentId: UUID;
  courseId: UUID;
  enrolledAt: Date;
  concludedAt?: Date;
  withdrawnAt?: Date;
};

export class Enrollment extends EntityBase<Props> {
  public static create(course: Course, student: Person) {
    return new Enrollment({
      courseId: course.getId(),
      studentId: student.getUser().getId(),
      enrolledAt: new Date(),
      concludedAt: undefined,
      withdrawnAt: undefined,
    });
  }

  public static createUnchecked(props: Props) {
    return new Enrollment(props);
  }

  public getStudentId() {
    return this.props.studentId;
  }

  public getCourseId() {
    return this.props.courseId;
  }

  public getEnrolledAt() {
    return this.props.enrolledAt;
  }

  public getConcludedAt() {
    return this.props.concludedAt;
  }

  public getWithdrawnAt() {
    return this.props.withdrawnAt;
  }

  public hasConcluded() {
    return !!this.props.concludedAt;
  }

  public hasWithdrawn() {
    return !!this.props.withdrawnAt;
  }

  public conclude() {
    if (this.props.concludedAt || this.hasWithdrawn()) return;
    this.props.concludedAt = new Date();
  }

  public withdraw() {
    if (this.props.withdrawnAt || this.hasConcluded()) return;
    this.props.withdrawnAt = new Date();
  }
}
