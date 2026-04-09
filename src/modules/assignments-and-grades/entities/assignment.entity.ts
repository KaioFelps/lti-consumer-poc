import { type UUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { EntityBase } from "@/core/entity-base";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Person } from "@/modules/identity/person/person.entity";
import { GradeOfAssignment } from "../aggregates/grade-of-assignment.aggregate";
import { InvalidAssignmentError } from "../errors/invalid-assignment.error";
import { Grade } from "./grade.entity";

type Props = {
  id: UUID;
  courseId: UUID;
  title: string;
  maxScore: number;
  releasedAt?: Date;
  deadline?: Date;
  createdAt: Date;
};

export class Assignment extends EntityBase<Props> {
  public static create(props: Omit<Props, "id" | "createdAt">) {
    const now = new Date();
    if (props.deadline && props.deadline <= now) {
      return e.left(
        new InvalidAssignmentError({
          argumentName: "deadline",
          errorMessageIdentifier: "assignments:errors:deadline-cannot-be-past",
        }),
      );
    }

    if (props.releasedAt && props.releasedAt < now) props.releasedAt = now;

    return e.right(new Assignment({ ...props, id: EntityBase.generateId(), createdAt: now }));
  }

  public static createUnchecked(props: Props) {
    return new Assignment(props);
  }

  public grade(student: Person, score: number, isReleased: boolean) {
    return pipe(
      Grade.create({
        studentId: student.getUser().getId(),
        assignmentId: this.props.id,
        score,
        maxScore: this.props.maxScore,
        released: isReleased,
      }),
      e.map((grade) => new GradeOfAssignment({ assignment: this, grade })),
    );
  }

  public getId() {
    return this.props.id;
  }

  public getTitle() {
    return this.props.title;
  }

  public setTitle(title: string) {
    this.props.title = title;
  }

  public getCourseId() {
    return this.props.courseId;
  }

  public attachToCourse(course: Course) {
    this.props.courseId = course.getId();
  }

  public canSubmit(now = new Date()) {
    return !this.props.deadline || now <= this.props.deadline;
  }

  public setDeadline(deadline: Date | undefined | null) {
    this.props.deadline = deadline ?? undefined;
  }

  public setReleasedAt(date: Date) {
    this.props.releasedAt = date;
  }

  public isReleased() {
    return !!this.props.releasedAt;
  }

  public getReleasedAt() {
    return this.props.releasedAt;
  }

  public getCreatedAt() {
    return this.props.createdAt;
  }
}
