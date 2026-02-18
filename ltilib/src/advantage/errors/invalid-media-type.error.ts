import { LtiAdvantageMediaType } from "../media-types";

export class InvalidMediaTypeError extends Error {
  public constructor(public readonly expectedMediaType: LtiAdvantageMediaType) {
    super();
  }
}
