import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { LtiAdvantageMediaType } from "../media-types";

export class InvalidMediaTypeError extends LtilibError {
  public constructor(public readonly expectedMediaType: LtiAdvantageMediaType) {
    super(415, `Expected media type ${expectedMediaType}.`);
  }
}
