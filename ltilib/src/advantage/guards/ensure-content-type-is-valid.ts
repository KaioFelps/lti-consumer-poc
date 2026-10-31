import { taskEither as te } from "fp-ts";
import { type TaskEither } from "fp-ts/lib/TaskEither.js";
import { InvalidContentTypeError } from "../errors/invalid-content-type.error.js";
import { LtiAdvantageMediaType } from "../media-types.js";

/**
 * Performs a char-by-char comparison to check whether `contentTypeHeader` matches
 * `requiredContentType`.
 */
export function ensureContentTypeIsValid(
  contentTypeHeader: string | undefined,
  requiredContentType: LtiAdvantageMediaType,
): TaskEither<InvalidContentTypeError, void> {
  if (contentTypeHeader === requiredContentType) return te.right(undefined);
  return te.left(new InvalidContentTypeError(requiredContentType));
}
