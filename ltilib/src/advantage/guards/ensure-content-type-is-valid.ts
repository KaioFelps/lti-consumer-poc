import { taskEither as te } from "fp-ts";
import { InvalidContentTypeError } from "../errors/invalid-content-type.error";
import { LtiAdvantageMediaType } from "../media-types";

/**
 * Performs a char-by-char comparison to check whether `contentTypeHeader` matches
 * `requiredContentType`.
 */
export function ensureContentTypeIsValid(
  contentTypeHeader: string | undefined,
  requiredContentType: LtiAdvantageMediaType,
) {
  if (contentTypeHeader === requiredContentType) return te.right(undefined);
  return te.left(new InvalidContentTypeError(requiredContentType));
}
