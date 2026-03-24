import { either as e } from "fp-ts";
import { InvalidContentTypeError } from "../errors/invalid-content-type.error";
import { LtiAdvantageMediaType } from "../media-types";

export function ensureContentTypeIsValid(
  contentTypeHeader: string | undefined,
  requiredContentType: LtiAdvantageMediaType,
) {
  if (contentTypeHeader === requiredContentType) return e.right(undefined);
  return e.left(new InvalidContentTypeError(requiredContentType));
}
