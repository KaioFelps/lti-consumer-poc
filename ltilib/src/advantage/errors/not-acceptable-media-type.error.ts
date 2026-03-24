import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { LtiAdvantageMediaType } from "../media-types";

export class NotAcceptableMediaTypeError extends LtilibError {
  public constructor(public readonly availableMediaType: LtiAdvantageMediaType) {
    super(
      406,
      `The requested media type(s) cannot be satisfied. The available response type is ${availableMediaType}.`,
    );
  }
}
