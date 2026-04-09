import { type UUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { EntityBase } from "@/core/entity-base";
import { Person } from "@/modules/identity/person/person.entity";
import { InvalidGradeError } from "../errors/invalid-grade.error";
import { Assignment } from "./assignment.entity";

type Props = {
  studentId: UUID;
  assignmentId: UUID;
  score: number;
  maxScore: number;
  released: boolean;
  lastUpdatedAt?: Date;
};

export class Grade extends EntityBase<Props> {
  public static create(props: Omit<Props, "lastUpdatedAt">) {
    return pipe(
      checkScore(props.score, props.maxScore),
      e.map(() => new Grade({ ...props, lastUpdatedAt: undefined })),
    );
  }

  public getScore() {
    return this.props.score;
  }

  public belongsToStudent(student: Person) {
    return student.getUser().getId() === this.props.studentId;
  }

  public belongsToAssignment(assignment: Assignment) {
    return assignment.getId() === this.props.assignmentId;
  }

  public getActivityId() {
    return this.props.assignmentId;
  }

  public getMaxScore() {
    return this.props.maxScore;
  }

  public release() {
    if (this.props.released) return;

    this.props.released = true;
    this.touch();
  }

  public retain() {
    if (!this.props.released) return;

    this.props.released = false;
    this.touch();
  }

  public isReleased() {
    return this.props.released;
  }

  public getLastUpdatedAt() {
    return this.props.lastUpdatedAt;
  }

  public setScore(newScore: number) {
    return pipe(
      checkScore(newScore, this.props.maxScore),
      e.map(() => {
        this.props.score = newScore;
        this.touch();
      }),
    );
  }

  private touch() {
    this.props.lastUpdatedAt = new Date();
  }
}

function checkScore(score: number, max: number) {
  if (score > max) {
    const error = new InvalidGradeError({
      argumentName: "score",
      errorMessageIdentifier: "grading:scores:errors:too-big",
      messageParams: { maximum: max },
    });

    return e.left(error);
  }

  if (score < 0) {
    const error = new InvalidGradeError({
      argumentName: "score",
      errorMessageIdentifier: "grading:scores:errors:too-small",
      messageParams: { minimum: 0 },
    });

    return e.left(error);
  }

  return e.right(undefined);
}
