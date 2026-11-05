import { LtiScore } from "$/assignment-and-grade/entities/index.js";

export class IncomingScoreEvent {
  public constructor(
    public readonly assignmentId: string,
    public readonly studentId: string,
    public readonly activityProgress: LtiScore.ActivityProgress,
    public readonly gradingProgress: LtiScore.GradingProgress,
    public readonly score: { given: number; maximum: number } | undefined,
    public readonly lastUpdatedAt: Date | string | undefined,
  ) {}
}
