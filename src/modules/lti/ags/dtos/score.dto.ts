import { Expose, Transform } from "class-transformer";
import { JsonValue } from "common/src/types/json-value";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ConfigCoreValidation } from "@/lib/core-validation";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { LtiScore } from "$/assignment-and-grade/entities";

const schema = z.object(
  {
    scoreGiven: z
      .number("lti:ags:publish-score:errors:score-given-must-be-number")
      .nonnegative("lti:ags:publish-score:errors:score-given-must-be-non-negative")
      .optional(),
    scoreMaximum: z
      .number("lti:ags:publish-score:errors:score-maximum-must-be-number")
      .positive("lti:ags:publish-score:errors:score-maximum-must-be-positive")
      .optional(),
    userId: z.uuid("lti:ags:publish-score:errors:user-id-must-be-string"),
    scoringUserId: z.coerce
      .string("lti:ags:publish-score:errors:scoring-user-id-must-be-string")
      .optional(),
    activityProgress: z.enum(
      [
        LtiScore.ActivityProgress.Completed,
        LtiScore.ActivityProgress.InProgress,
        LtiScore.ActivityProgress.Initialized,
        LtiScore.ActivityProgress.Started,
        LtiScore.ActivityProgress.Submitted,
      ],
      "lti:ags:publish-score:errors:activity-progress-out-of-set",
    ),
    gradingProgress: z.enum(
      [
        LtiScore.GradingProgress.Failed,
        LtiScore.GradingProgress.FullyGraded,
        LtiScore.GradingProgress.NotReady,
        LtiScore.GradingProgress.Pending,
        LtiScore.GradingProgress.PendingManual,
      ],
      "lti:ags:publish-score:errors:grading-progress-out-of-set",
    ),
    // gonna let ltilib validate timestamps
    // thus, errors're gonna be translated in the controller
    timestamp: z.string("lti:ags:publish-score:errors:timestamp-must-be-datestring"),
    submission: z
      .object(
        {
          startedAt: z
            .string("lti:ags:publish-score:errors:startedAt-must-be-datestring")
            .optional(),
          submittedAt: z
            .string("lti:ags:publish-score:errors:submittedAt-must-be-datestring")
            .optional(),
        },
        "lti:ags:publish-score:errors:submission-must-be-object",
      )
      .optional(),
    comment: z
      .union([z.null(), z.string()], "lti:ags:publish-score:errors:comment-must-be-null-or-string")
      .optional(),
    customParameters: z
      .record(
        z.string(),
        z.any(),
        "lti:ags:publish-score:errors:custom-parameters-should-be-records",
      )
      .optional(),
  },
  { error: "lti:ags:publish-score:errors:body-should-be-object" },
);

const KNOWN_KEYS = new Set(Object.keys(schema.shape));
type Schema = z.infer<typeof schema>;

@ConfigCoreValidation({ shallUnflatten: false })
export class ScoreDTO implements DTO, Schema {
  @Expose() public readonly userId!: string;
  @Expose() public readonly activityProgress!: LtiScore.ActivityProgress;
  @Expose() public readonly gradingProgress!: LtiScore.GradingProgress;
  @Expose() public readonly timestamp!: string;
  @Expose() public readonly scoreGiven?: number;
  @Expose() public readonly scoreMaximum?: number;
  @Expose() public readonly scoringUserId?: string;
  @Expose() public readonly comment?: string | null;

  @Transform(({ obj }) => obj.submission)
  @Expose()
  public readonly submission?: Schema["submission"];

  @Expose()
  @Transform(({ obj }) => {
    const source = (obj ?? {}) as Record<string, JsonValue>;
    const { customParameters: nested, ...rest } = source;

    const extraTopLevel: Record<string, JsonValue> = {};

    for (const [key, val] of Object.entries(rest)) {
      if (!KNOWN_KEYS.has(key)) extraTopLevel[key] = val;
    }

    const merged = {
      ...extraTopLevel,
      ...(typeof nested === "object" && nested !== null ? nested : {}),
    };

    return Object.keys(merged).length > 0 ? merged : undefined;
  })
  public readonly customParameters?: Record<string, JsonValue>;

  public validate() {
    const { success, data, error: validationErrors } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
