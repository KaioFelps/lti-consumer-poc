import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { JsonValue } from "oidc-provider";
import { Context } from "$/core/context";
import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";
import { Platform } from "$/core/platform";
import { LtiScore } from "../entities";
import { MissingPlatformAgsConfigurationError } from "../errors";

export type PresentedLtiResult = {
  /**
   * A fully qualified URL that identifies this specific result.
   */
  id: URL;
  /**
   * A fully qualified URL that identifies the line item to which this result belongs.
   */
  scoreOf: URL;
  /**
   * The identifier of the user whose score this result refers to.
   */
  userId: string;
  /**
   * The current score for this user. (It's the value of `score.scoreGiven`.)
   * Can be nullish when there is no score for the user.
   */
  resultScore: number | undefined | null;
  /**
   * A positive number representing the maximum possible score for this user in this line item.
   * @default 1
   */
  resultMaximum: number;
  /**
   * The ID of the user (usually an instructor) that has graded this user in this line item.
   * @note this refers to {@link LtiScore.scoringUserId `LtiScore.scoringUserId`}.
   */
  scoringUserId: string | undefined;
  /**
   * Some comment defined by the scoring user or the LTI tool regarding this user's score.
   * @note this reflects {@link LtiScore.comment `LtiScore.comment`}.
   */
  comment: string | undefined | null;
};

export function presentLtiResult<
  CustomParameters extends Record<string, JsonValue> = Record<string, JsonValue>,
>(
  lineItemId: string,
  score: LtiScore,
  context: Context<unknown>,
  platform: Platform,
): Either<MisconfiguredPlatformError, PresentedLtiResult & CustomParameters> {
  if (!platform.agsConfiguration) {
    return e.left(new MissingPlatformAgsConfigurationError());
  }

  const presentedLineItem = {
    ...(score.customParameters as CustomParameters),
    comment: score.comment,
    id: platform.agsConfiguration.prepareResultId(context, lineItemId, score.userId),
    scoreOf: platform.agsConfiguration.lineItemEndpoint(context, lineItemId),
    userId: score.userId,
    resultMaximum: score.score?.maximum ?? 1,
    resultScore: score.score?.given,
    scoringUserId: score.scoringUserId,
  } satisfies PresentedLtiResult & CustomParameters;

  return e.right(presentedLineItem);
}
