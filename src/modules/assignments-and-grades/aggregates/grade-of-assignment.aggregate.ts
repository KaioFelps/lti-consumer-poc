import { EntityBase } from "@/core/entity-base";
import { Assignment } from "../entities/assignment.entity";
import { Grade } from "../entities/grade.entity";

type Props = {
  grade: Grade;
  assignment: Assignment;
};

export class GradeOfAssignment extends EntityBase<Props> {
  public static create(props: Props) {
    return new GradeOfAssignment(props);
  }

  public getGrade() {
    return this.props.grade;
  }

  public getAssignment() {
    return this.props.assignment;
  }

  public setScore(newScore: number) {
    return this.getGrade().setScore(newScore);
  }
}
