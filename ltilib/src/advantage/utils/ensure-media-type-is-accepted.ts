import { either as e } from "fp-ts";
import { NotAcceptableMediaTypeError } from "../errors/not-acceptable-media-type.error";
import { LtiAdvantageMediaType } from "../media-types";

export function ensureMediaTypeIsAccepted(
  acceptHeader: string | undefined,
  availableMediaType: LtiAdvantageMediaType,
) {
  if (!acceptHeader) return e.left(new NotAcceptableMediaTypeError(availableMediaType));

  const acceptsEverything = acceptHeader.includes("*/*") || acceptHeader.includes("application/*");
  if (acceptsEverything) return e.right(undefined);

  // using a `.include` directly in the string list would allow some falsy-positives,
  // i.e., an invalid type prefixed by `availableMediaType`.
  const acceptedMediaTypes = acceptHeader.split(",").map((value) => value.split(";")[0].trim());
  const acceptsAvailableMediaType = acceptedMediaTypes.includes(availableMediaType);
  if (acceptsAvailableMediaType) return e.right(undefined);

  return e.left(new NotAcceptableMediaTypeError(availableMediaType));
}
