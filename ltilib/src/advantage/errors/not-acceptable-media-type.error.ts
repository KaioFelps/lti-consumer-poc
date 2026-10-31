import { LtilibError } from "$/core/errors/bases/ltilib.error.js";
import { LtiAdvantageMediaType } from "../media-types.js";

export class NotAcceptableMediaTypeError extends LtilibError {
  public constructor(public readonly availableMediaType: LtiAdvantageMediaType) {
    super(
      406,
      `The requested media type(s) cannot be satisfied. The available response type is ${availableMediaType}.`,
    );
  }
}
