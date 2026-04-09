import { type UUID } from "common/src/types/uuid";
import { type Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { GradeOfAssignment } from "../aggregates/grade-of-assignment.aggregate";
import { Assignment } from "../entities/assignment.entity";
import { AssignmentNotFoundError } from "../errors/assignment-not-found.error";
import { GradeNotFoundError } from "../errors/grade-not-found.error";

export abstract class AssignmentsRepository {
  public abstract findById(
    assignmentId: UUID,
  ): Promise<Either<IrrecoverableError | AssignmentNotFoundError, Assignment>>;

  public abstract updateAssignment(
    assignment: Assignment,
  ): Promise<Either<IrrecoverableError, Assignment>>;

  public abstract saveGrade(
    gradeOfAssignment: GradeOfAssignment,
  ): Promise<Either<IrrecoverableError, GradeOfAssignment>>;

  public abstract findGradeOfAssignment(
    assignmentId: UUID,
    studentId: UUID,
  ): Promise<
    Either<IrrecoverableError | AssignmentNotFoundError | GradeNotFoundError, GradeOfAssignment>
  >;

  public abstract createAssignment(
    assignment: Assignment,
  ): Promise<Either<IrrecoverableError, Assignment>>;
}
