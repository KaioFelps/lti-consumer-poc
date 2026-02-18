import { LtilibError } from "./bases/ltilib.error";

interface ILtiRepositoryError<InnerError> {
  type: "ExternalError" | "NotFound";
  cause: InnerError;
}

export class LtiRepositoryError<InnerError = unknown>
  extends LtilibError
  implements ILtiRepositoryError<InnerError>
{
  public readonly type: "ExternalError" | "NotFound";
  public readonly cause: InnerError;

  protected static resolveHttpStatusCode(type: LtiRepositoryError["type"]) {
    switch (type) {
      case "ExternalError":
        return 500;
      case "NotFound":
        return 404;
    }
  }

  public constructor({ cause, type }: ILtiRepositoryError<InnerError>) {
    super(LtiRepositoryError.resolveHttpStatusCode(type));
    this.type = type;
    this.cause = cause;
    this.name = LtiRepositoryError.name;
  }
}
