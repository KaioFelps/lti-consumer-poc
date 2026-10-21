import { type UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Grade } from "@/modules/assignments-and-grades/entities/grade.entity";
import { GradeNotFoundError } from "@/modules/assignments-and-grades/errors/grade-not-found.error";
import { LtiScoresRepository as BaseLtiScoresRepository } from "$/assignment-and-grade/repositories";

/**
 * A score given to a student on a specific line item.
 */
export type LineItemStudentScore = {
  lineItemId: UUID;
  studentId: UUID;
  scoreGiven: number;
  scoreMaximum: number | null;
  timestamp: Date;
};

export abstract class LtiScoresRepository extends BaseLtiScoresRepository {
  public abstract findUserScoreOnAssignment(
    userId: UUID,
    assignmentId: UUID,
    courseId: UUID,
  ): Promise<Either<GradeNotFoundError | IrrecoverableError, Grade>>;

  public abstract findUsersScoresOnAssignment(
    usersIds: UUID[],
    assignmentId: UUID,
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Grade[]>>;

  /**
   * Fetches, in a single query, every score of `studentsIds` that belongs to any of
   * the line items in `lineItemsIds`.
   *
   * - Implementations should run something like
   *   `WHERE line_item_id = ANY(:lineItemsIds) AND user_id = ANY(:studentsIds)`.
   * - Records without `score_given` must **not** be returned. A missing record means
   *   "no score yet" and is rendered as an empty cell by the caller.
   * - No pagination: the caller is bounded by the course size.
   * - When either array is empty, an empty array must be returned.
   *
   * @param lineItemsIds The line items whose scores must be fetched.
   * @param studentsIds The students (course enrollments) whose scores must be fetched.
   */
  public abstract findScoresOfStudentsOnLineItems(
    lineItemsIds: UUID[],
    studentsIds: UUID[],
  ): Promise<Either<IrrecoverableError, LineItemStudentScore[]>>;
}
