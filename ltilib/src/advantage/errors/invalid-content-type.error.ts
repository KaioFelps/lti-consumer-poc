import { LtilibError } from "$/core/errors/bases/ltilib.error.js";
import { LtiAdvantageMediaType } from "../media-types.js";

export class InvalidContentTypeError extends LtilibError {
  public constructor(public readonly expectedMediaType: LtiAdvantageMediaType) {
    super(415, `Expected media type ${expectedMediaType}.`);
  }
}
