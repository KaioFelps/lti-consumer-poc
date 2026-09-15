import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { CustomParameters, RawCustomParameters } from "$/assignment-and-grade/custom-parameters";
import { InvalidScoreArgumentError } from "$/assignment-and-grade/errors";
import { validateLtiIso8601AndPreciseTimestamp } from "../../../advantage/utils/validate-lti-iso-8601-precise-timestamp";
import { resolveSubmission } from "./helpers";

export interface ILtiScore {
  /**
   * The score the user (identified by `userId`) is being graded with.
   *
   * @note When omitted, it must update the related line item and erase any previously
   * existing grade.
   */
  score?: {
    given: number;
    maximum: number;
  };

  /**
   * The platform-local ID of the user/student that launched, concluded and now is
   * being graded on some external resource.
   */
  userId: string;

  /**
   * The (platform-local) ID of the user/instructor that is grading the user (identified
   * by `userId`) on some external resource.
   *
   * @note Might be ommitted when the tool doesn't support this feature or the score was
   * graded automatically.
   *
   * @note If the platform doesn't support or need this info, it may be ignored.
   */
  scoringUserId: string | undefined;

  /**
   * Indicates what kind of update this score is performing to the line item.
   * @see {@link LtiScore.ActivityProgress `LtiScore.ActivityProgress`}
   */
  activityProgress: LtiScore.ActivityProgress;

  /**
   * Indicates the grading progress that this score represents.
   * @see {@link LtiScore.GradingProgress `LtiScore.GradingProgress`}
   */
  gradingProgress: LtiScore.GradingProgress;

  /**
   * Indicate the datetime when this score has been issued by the tool.

   * @note **Must be a ISO 8601 conformat datetime string.** Passing the raw
   * datetime string (i.e., not coerced by Zod or some schema validator) rather
   * than `Date` instances is preferred, since ltilib performs the conformance
   * validation.
   */
  timestamp: Date | string;

  /**
   * A comment regarding the submission.
   */
  comment?: string;

  /**
   * Metadata about this submission attempt.
   */
  submission?: {
    /**
     * Indicates when the grading process has began to some external resource. E.g.,
     * the timestamp of the student's first attempt.
     *
     * @note **Must be a ISO 8601 conformat datetime string.** Passing the raw
     * datetime string (i.e., not coerced by Zod or some schema validator) rather
     * than `Date` instances is preferred, since ltilib performs the conformance
     * validation.
     */
    startedAt?: Date | string;
    /**
     * Indicates when the grading process has finished and that this is
     * the student's final grade.
     *
     * @note **Must be a ISO 8601 conformat datetime string.** Passing the raw
     * datetime string (i.e., not coerced by Zod or some schema validator) rather
     * than `Date` instances is preferred, since ltilib performs the conformance
     * validation.
     */
    submittedAt?: Date | string;
  };

  /**
   * Optional custom parameters as per [section 3.1.2 of LTI AGS specification].
   *
   * [section 3.1.2 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#extensions
   */
  customParameters?: RawCustomParameters;
}

type ILtiScoreConstructorArgs = Omit<ILtiScore, "score" | "comment"> & {
  score: Partial<ILtiScore["score"]>;
  comment: string | undefined | null;
};

export class LtiScore implements ILtiScore {
  private parameters: CustomParameters = new CustomParameters();
  /**
   * When `true`, it means that this score was created with `null` comment.
   * This kind of scores requires the `comment` to be cleared when they're used
   * to update another score.
   */
  private commentWasNull = false;

  public constructor(
    public userId: string,
    public scoringUserId: string | undefined,
    public activityProgress: LtiScore.ActivityProgress,
    public gradingProgress: LtiScore.GradingProgress,
    public timestamp: string | Date,
    public comment: string | undefined,
    public submission: ILtiScore["submission"] | undefined,
    public score: ILtiScore["score"] | undefined,
  ) {}

  public get customParameters() {
    return this.parameters.toValue();
  }

  public static create(props: ILtiScoreConstructorArgs) {
    return pipe(
      e.Do,
      e.bindW("timestamp", () => LtiScore.validateTimestamp(props.timestamp, "timestamp")),
      e.bindW("startedAt", () =>
        LtiScore.validateTimestamp(props.submission?.startedAt, "submission.startedAt"),
      ),
      e.bindW("submittedAt", () =>
        LtiScore.validateTimestamp(props.submission?.submittedAt, "submission.submittedAt"),
      ),
      e.let("comment", () => props.comment ?? undefined),
      e.bindW("score", () => LtiScore.validateScores(props.score)),
      e.let("submission", ({ startedAt, submittedAt }) => ({ startedAt, submittedAt })),
      e.chainFirstW(({ submission }) => LtiScore.validateSubmissionTimestamps(submission)),
      e.map(
        ({ score, submission, timestamp, comment }) =>
          new LtiScore(
            props.userId,
            props.scoringUserId,
            props.activityProgress,
            props.gradingProgress,
            timestamp,
            comment,
            submission,
            score,
          ),
      ),
      e.tap((score) => {
        if (props.comment === null) score.commentWasNull = true;
        return e.right(undefined);
      }),
      e.chainFirstW((score) => score.parameters.mergeSilently(props.customParameters)),
    );
  }

  /**
   * Re-scales the actual scores (if existing) to the line item's
   * limit, as per [section 3.4.4 from the AGS specs].
   *
   * [section 3.4.4 from the AGS specs]: https://www.imsglobal.org/spec/lti-ags/v2p0#scoregiven-and-scoremaximum
   */
  public rescaleScore(lineItemScoreMaximum: number) {
    if (!this.score) return;
    const weight = this.score.given / this.score.maximum;
    const rescaledScore = lineItemScoreMaximum * weight;
    return rescaledScore;
  }

  /**
   * Updates this score with incoming data as per AGS specification.
   */
  public update(incomingScore: LtiScore) {
    // most of validations have already been checked in the static `create` constructor, hence
    // there ain't no need to check it all again

    return pipe(
      e.Do,
      e.let("submission", () =>
        resolveSubmission.call(
          this,
          incomingScore.submission,
          incomingScore.activityProgress,
          new Date(incomingScore.timestamp),
        ),
      ),
      e.bindW("timestamp", () => this.resolveTimestamp(incomingScore.timestamp)),
      e.chainFirstW(({ submission }) => LtiScore.validateSubmissionTimestamps(submission)),
      e.map(({ submission, timestamp }) => {
        this.submission = submission;
        this.timestamp = timestamp;

        this.comment = incomingScore.commentWasNull ? this.comment : incomingScore.comment;
        this.score = incomingScore.score;
        this.activityProgress = incomingScore.activityProgress;
        this.gradingProgress = incomingScore.gradingProgress;
        this.userId = incomingScore.userId;

        if (incomingScore.scoringUserId) this.scoringUserId = incomingScore.scoringUserId;

        return this;
      }),
    );
  }

  private resolveTimestamp(incomingTimestamp: Date | string) {
    const timestampAsDate = new Date(incomingTimestamp);
    const isOutdated = timestampAsDate.getTime() < new Date(this.timestamp).getTime();
    return isOutdated
      ? e.left(new InvalidScoreArgumentError("timestamp", "outdated"))
      : e.right(timestampAsDate);
  }

  /**
   * Wrapper for local pipe and transformation of ISO 8601 validation.
   */
  private static validateTimestamp<T extends Date | string | undefined>(
    timestamp: T,
    field: InvalidScoreArgumentError.Fields,
  ): Either<InvalidScoreArgumentError, T extends undefined ? Date | undefined : Date> {
    if (timestamp === undefined)
      return e.right(undefined as T extends undefined ? undefined : Date);

    return pipe(
      validateLtiIso8601AndPreciseTimestamp(timestamp),
      e.mapLeft((reason) => new InvalidScoreArgumentError(field, reason)),
    );
  }

  private static validateSubmissionTimestamps(submission: LtiScore["submission"]) {
    if (
      submission?.startedAt &&
      submission?.submittedAt &&
      new Date(submission.startedAt).getTime() > new Date(submission.submittedAt).getTime()
    ) {
      return e.left(
        new InvalidScoreArgumentError("submission.submittedAt", "must_be_after_started_at"),
      );
    }

    return e.right(submission);
  }

  private static validateScores(
    scores: Partial<LtiScore["score"]> = {},
  ): Either<InvalidScoreArgumentError<"scoreGiven" | "scoreMaximum">, LtiScore["score"]> {
    if (scores.given === undefined || scores.given === null) return e.right(undefined);

    if (scores.maximum === undefined) {
      return e.left(new InvalidScoreArgumentError("scoreMaximum", "required"));
    } else if (scores.maximum <= 0) {
      return e.left(new InvalidScoreArgumentError("scoreMaximum", "must_be_greater_than_zero"));
    }

    if (scores.given < 0) {
      return e.left(
        new InvalidScoreArgumentError("scoreGiven", "must_be_equal_or_greater_than_zero"),
      );
    }

    return e.right({ given: scores.given, maximum: scores.maximum });
  }
}

export namespace LtiScore {
  /**
   * Indicates to the platform the status of the user towards the activity's completion.
   *
   * @see https://www.imsglobal.org/spec/lti-ags/v2p0#activityprogress
   */
  export enum ActivityProgress {
    /**
     * Indicates that the user has not started the activity, or the activity has
     * been reset for that student.
     */
    Initialized = "Initialized",
    /**
     * Indicates that the activity associated with the line item has been started
     * by the user to which the result relates.
     */
    Started = "Started",
    /**
     * Indicates that the activity is being drafted and is available for comment.
     */
    InProgress = "InProgress",
    /**
     * Indicates that the activity has been submitted at least once by the user
     * but the user is still able make further submissions.
     */
    Submitted = "Submitted",
    /**
     * Indicates that the user has completed the activity associated with the line item.
     */
    Completed = "Completed",
  }

  /**
   * Indicates to the platform the status of the grading process, including
   * allowing to inform when human intervention is needed.
   *
   * @see https://www.imsglobal.org/spec/lti-ags/v2p0#gradingprogress
   */
  export enum GradingProgress {
    /**
     * The grading process is completed; the score value, if any, represents the current
     * Final Grade; the gradebook may display the grade to the learner
     */
    FullyGraded = "FullyGraded",
    /**
     * Final Grade is pending, but does not require manual intervention; if
     * a Score value is present, it indicates the current value is partial and
     * may be updated.
     */
    Pending = "Pending",
    /**
     * Final Grade is pending, and it does require human intervention; if a Score
     * value is present, it indicates the current value is partial and may be
     * updated during the manual grading.
     */
    PendingManual = "PendingManual",
    /**
     * The grading could not complete.
     */
    Failed = "Failed",
    /**
     * There is no grading process occurring; for example, the student has not
     * yet made any submission.
     */
    NotReady = "NotReady",
  }
}
