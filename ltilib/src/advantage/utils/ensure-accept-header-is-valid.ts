import { either as e } from "fp-ts";
import { InvalidMediaTypeError } from "../errors/invalid-media-type.error";
import { LtiAdvantageMediaType } from "../media-types";

type Params = {
  acceptHeader: string | undefined;
  requiredMediaType: LtiAdvantageMediaType;
};

export function ensureAcceptHeaderIsValid({ acceptHeader, requiredMediaType }: Params) {
  if (acceptHeader === requiredMediaType) return e.right(undefined);
  return e.left(new InvalidMediaTypeError(requiredMediaType));
}
