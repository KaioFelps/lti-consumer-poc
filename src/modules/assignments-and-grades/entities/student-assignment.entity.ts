import { type UUID } from "common/src/types/uuid";
import { EntityBase } from "@/core/entity-base";

type Props = {
  assignmentId: UUID;
  studentId: UUID;
  releasedAt?: Date;
  assignedAt: Date;
};

export class StudentAssignment extends EntityBase<Props> {
  public static create(props: Omit<Props, "assignedAt">) {
    return new StudentAssignment({ ...props, assignedAt: new Date() });
  }

  public static createUnchecked(props: Props) {
    return new StudentAssignment(props);
  }

  public getAssignmentId() {
    return this.props.assignmentId;
  }

  public getStudentId() {
    return this.props.studentId;
  }

  public release() {
    this.props.releasedAt = new Date();
  }

  public retain() {
    this.props.releasedAt = undefined;
  }

  public getReleasedAt() {
    return this.props.releasedAt;
  }

  public getAssignedAt() {
    return this.props.assignedAt;
  }
}
