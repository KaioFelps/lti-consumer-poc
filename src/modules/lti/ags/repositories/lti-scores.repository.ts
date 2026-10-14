import { type UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Grade } from "@/modules/assignments-and-grades/entities/grade.entity";
import { GradeNotFoundError } from "@/modules/assignments-and-grades/errors/grade-not-found.error";
import { LtiScoresRepository as BaseLtiScoresRepository } from "$/assignment-and-grade/repositories";

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
}
