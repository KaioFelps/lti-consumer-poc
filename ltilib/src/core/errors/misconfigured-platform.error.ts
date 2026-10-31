import { LtilibError } from "./bases/ltilib.error.js";

export class MisconfiguredPlatformError extends LtilibError {
  public constructor(message: string) {
    super(500, message);
  }
}
