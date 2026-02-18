import { LtilibError } from "./bases/ltilib.error";

export class InvalidRedirectUriError extends LtilibError {
  public constructor(
    message: string,
    public readonly invalidRedirectUri: string,
  ) {
    super(400, message);
  }
}
