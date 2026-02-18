import { LtilibError } from "./bases/ltilib.error";

export class MalformedRequestError extends LtilibError {
  public readonly cause: "response_mode" | "response_type" | "prompt" | "scope" | "body";

  public constructor(message: string, cause: MalformedRequestError["cause"]) {
    super(400, message, { cause });
  }
}
