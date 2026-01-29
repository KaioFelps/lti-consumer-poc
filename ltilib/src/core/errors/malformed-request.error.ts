export class MalformedRequestError extends Error {
  public readonly cause:
    | "response_mode"
    | "response_type"
    | "prompt"
    | "scope"
    | "body";

  public constructor(message: string, cause: MalformedRequestError["cause"]) {
    super(message);
    this.cause = cause;
  }
}
