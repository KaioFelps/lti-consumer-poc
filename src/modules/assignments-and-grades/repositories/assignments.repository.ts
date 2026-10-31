import { type UUID } from "common/src/types/uuid.js";
import { type Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { GradeOfAssignment } from "../aggregates/grade-of-assignment.aggregate.js";
import { Assignment } from "../entities/assignment.entity.js";
import { AssignmentNotFoundError } from "../errors/assignment-not-found.error.js";
import { GradeNotFoundError } from "../errors/grade-not-found.error.js";

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

  public abstract findManyAssignmentsByCourseId(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Assignment[]>>;
}
