import { LtilibError } from "./bases/ltilib.error";

export class MisconfiguredPlatformError extends LtilibError {
  public constructor(message: string) {
    super(500, message);
  }
}
