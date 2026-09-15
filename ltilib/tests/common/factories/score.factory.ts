import { generateUUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import { LtiScore } from "$/assignment-and-grade/entities";
import { NullifyUndefined } from "../types/nullify";

type CreateScoreConstructorArgs = Partial<NullifyUndefined<Parameters<typeof LtiScore.create>[0]>>;

export function createScoreGrades(score: CreateScoreConstructorArgs["score"]) {
  let resolvedScore = {} as NonNullable<CreateScoreConstructorArgs["score"]>;

  if (score) resolvedScore = { ...score };

  if (resolvedScore.given !== undefined && resolvedScore.maximum === undefined) {
    resolvedScore.maximum = resolvedScore.given;
  } else if (resolvedScore.given === undefined && resolvedScore.maximum !== undefined) {
    resolvedScore.given = resolvedScore.maximum;
  } else {
    resolvedScore.given = 10;
    resolvedScore.maximum = 10;
  }

  return resolvedScore;
}

export function createScore({
  activityProgress = LtiScore.ActivityProgress.Initialized,
  gradingProgress = LtiScore.GradingProgress.NotReady,
  userId = generateUUID(),
  timestamp = new Date(),
  customParameters,
  scoringUserId,
  submission, // don't initialize this
  comment,
  score,
}: CreateScoreConstructorArgs = {}) {
  const scoreResult = LtiScore.create({
    activityProgress,
    gradingProgress,
    timestamp,
    userId,
    scoringUserId: scoringUserId ?? undefined,
    score: score ?? undefined,
    submission: submission ?? undefined,
    customParameters: customParameters ?? undefined,
    comment: comment,
  });

  assert(either.isRight(scoreResult));
  return scoreResult.right;
}

export default {
  createScore,
  createScoreGrades,
};
