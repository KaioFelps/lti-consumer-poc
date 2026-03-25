import { taskEither as te } from "fp-ts";
import { NotAcceptableMediaTypeError } from "../errors/not-acceptable-media-type.error";
import { LtiAdvantageMediaType } from "../media-types";

export function ensureMediaTypeIsAccepted(
  acceptHeader: string | undefined,
  availableMediaType: LtiAdvantageMediaType,
) {
  const acceptsEverything =
    !acceptHeader || //
    acceptHeader.includes("*/*") ||
    acceptHeader.includes("application/*");

  if (acceptsEverything) return te.right(undefined);

  // using a `.include` directly in the string list would allow some falsy-positives,
  // i.e., an invalid type prefixed by `availableMediaType`.
  const acceptedMediaTypes = acceptHeader.split(",").map((value) => value.split(";")[0].trim());
  const acceptsAvailableMediaType = acceptedMediaTypes.includes(availableMediaType);
  if (acceptsAvailableMediaType) return te.right(undefined);

  return te.left(new NotAcceptableMediaTypeError(availableMediaType));
}
