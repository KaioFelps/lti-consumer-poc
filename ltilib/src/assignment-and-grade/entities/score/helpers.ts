import { LtiScore } from ".";

/**
 * Resolves submission timestamps (startedAt and submittedAt).
 * It expects both datetimes to have been previously validated as conformant per ISO 8601.
 */
export function resolveSubmission(
  this: LtiScore,
  incomingSubmission: LtiScore["submission"],
  incomingActivityProgress: LtiScore.ActivityProgress,
  incomingTimestamp: Date,
) {
  // quote from AGS spec
  // started at
  // The tool should include the startedAt in subsequent score updates. However, if not present,
  // the platform should use the last value it received unless the activityProgress is set back to Initialized,
  // in which case the startedAt value should be cleared.
  // In the abscence of startedAt, the learning platform should continue to use the timestamp of the 1st
  // score event it receives with an activityProgress of Started or InProgress as the startedAt value.
  //
  // submitted at
  // If this field, and the startedAt field are both present, then this field must be equal to, or
  // later in time than, the startedAt field. The tool should include the submittedAt in subsequent
  // score updates. However, if not present, the platform should use the last value it received unless
  // the activityProgress is set back to Initialized, Started or InProgress, in which case the submittedAt
  // value should be cleared.
  // In the abscence of submittedAt, the learning platform should continue to use the timestamp of the 1st score
  // event it receives with an activityProgress of Submitted or Completed as the submittedAt value.

  const incomingStartedAt = incomingSubmission?.startedAt
    ? new Date(incomingSubmission.startedAt)
    : undefined;

  const incomingSubmittedAt = incomingSubmission?.submittedAt
    ? new Date(incomingSubmission.submittedAt)
    : undefined;

  const submission = {
    startedAt: this.submission?.startedAt ? new Date(this.submission.startedAt) : undefined,
    submittedAt: this.submission?.submittedAt ? new Date(this.submission.submittedAt) : undefined,
  } satisfies LtiScore["submission"];

  if (incomingStartedAt) {
    submission.startedAt = incomingStartedAt;
  } else {
    if (incomingActivityProgress === LtiScore.ActivityProgress.Initialized) {
      submission.startedAt = undefined;
    }
  }

  const isInProgressOrStarted = [
    LtiScore.ActivityProgress.InProgress,
    LtiScore.ActivityProgress.Started,
  ].includes(incomingActivityProgress);

  if (!submission.startedAt && isInProgressOrStarted) {
    submission.startedAt = incomingTimestamp;
  }

  if (incomingSubmittedAt) {
    submission.submittedAt = incomingSubmittedAt;
  } else {
    const shouldResetSubmittedAt = [
      LtiScore.ActivityProgress.Initialized,
      LtiScore.ActivityProgress.Started,
      LtiScore.ActivityProgress.InProgress,
    ].includes(incomingActivityProgress);

    if (shouldResetSubmittedAt) {
      submission.submittedAt = undefined;
    }
  }

  const canUseTimestampAsSubmittedAt = [
    LtiScore.ActivityProgress.Submitted,
    LtiScore.ActivityProgress.Completed,
  ].includes(incomingActivityProgress);

  if (!submission.submittedAt && canUseTimestampAsSubmittedAt) {
    submission.submittedAt = incomingTimestamp;
  }

  return submission;
}
