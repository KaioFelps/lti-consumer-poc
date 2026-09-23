import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { LtiScore } from "$/assignment-and-grade/entities";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiScoresQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiScoresT"]>;

export type LtiScoreRow = BuildQueryResult<
  Schema,
  Schema["ltiScoresT"],
  typeof requiredQueryConfig
>;

const requiredQueryConfig = {} as const satisfies LtiScoresQueryConfig;

function fromRow(row: LtiScoreRow): LtiScore {
  return LtiScore.createUnchecked({
    activityProgress: row.activityProgress,
    gradingProgress: row.gradingProgress,
    timestamp: new Date(row.timestamp),
    userId: row.userId,
    comment: row.comment ?? undefined,
    customParameters: row.customParameters ?? undefined,
    scoringUserId: row.scoringUserId ?? undefined,
    score:
      row.scoreGiven !== null && row.scoreMaximum !== null
        ? {
            given: row.scoreGiven,
            maximum: row.scoreMaximum,
          }
        : undefined,
    submission:
      row.submittedAt !== null || row.startedAt !== null
        ? {
            startedAt: row.startedAt ?? undefined,
            submittedAt: row.submittedAt ?? undefined,
          }
        : undefined,
  });
}

function intoRow(score: LtiScore, lineItemId: string): LtiScoreRow {
  return {
    lineItemId,
    userId: score.userId,
    comment: score.comment ?? null,
    gradingProgress: score.gradingProgress,
    activityProgress: score.activityProgress,
    scoreGiven: score.score?.given ?? null,
    scoreMaximum: score.score?.maximum ?? null,
    scoringUserId: score.scoringUserId ?? null,
    timestamp: new Date(score.timestamp),
    startedAt: score.submission?.startedAt ? new Date(score.submission.startedAt) : null,
    submittedAt: score.submission?.submittedAt ? new Date(score.submission.submittedAt) : null,
    customParameters: { ...score.customParameters } as Record<string, string>,
  };
}

export default {
  requiredQueryConfig,
  fromRow,
  intoRow,
};
