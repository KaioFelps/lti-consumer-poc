import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { GradeNotFoundError } from "@/modules/assignments-and-grades/errors/grade-not-found.error";
import { LtiScoresRepository } from "../repositories/lti-scores.repository";

type Params = {
  assignmentId: UUID;
  studentId: UUID;
  courseId: UUID;
};

type Response = {
  hasGrade: boolean;
  hasSubmitted: boolean;
  details: {
    grade: number;
    maxGrade: number;
    gradedAt: Date;
    lastUpdatedAt: Date | undefined;
  } | null;
};

@Injectable()
export class FindStudentScoreDetailsByExternalAssignmentIdService {
  public constructor(private readonly scoresRepo: LtiScoresRepository) {}

  public exec({ assignmentId, studentId, courseId }: Params) {
    return pipe(
      () => this.scoresRepo.findUserScoreOnAssignment(studentId, assignmentId, courseId),
      te.map(
        (score) =>
          ({
            hasSubmitted: true,
            hasGrade: score.isReleased(),
            details: score.isReleased()
              ? {
                  grade: score.getScore(),
                  maxGrade: score.getMaxScore(),
                  gradedAt: score.getGradedAt(),
                  lastUpdatedAt: score.getLastUpdatedAt(),
                }
              : null,
          }) satisfies Response,
      ),
      te.orElse((error) =>
        error instanceof GradeNotFoundError
          ? te.right({
              details: null,
              hasGrade: false,
              hasSubmitted: false,
            } as Response)
          : te.left(error),
      ),
    )();
  }
}
