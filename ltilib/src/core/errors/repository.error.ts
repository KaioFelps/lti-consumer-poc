import { LtilibError } from "./bases/ltilib.error";

interface ILtiRepositoryError<InnerError> {
  type: "ExternalError" | "NotFound";
  cause: InnerError;
  subject: string | undefined;
}

type LtiRepositoryErrorConstructor<InnerError> =
  | {
      type: "ExternalError";
      cause: InnerError;
    }
  | {
      type: "NotFound";
      cause: InnerError;
      subject: string | undefined;
    };

export class LtiRepositoryError<InnerError = unknown>
  extends LtilibError
  implements ILtiRepositoryError<InnerError>
{
  public readonly type: "ExternalError" | "NotFound";
  public readonly subject: string | undefined;
  public readonly cause: InnerError;

  protected static resolveHttpStatusCode(type: LtiRepositoryError["type"]) {
    switch (type) {
      case "ExternalError":
        return 500;
      case "NotFound":
        return 404;
    }
  }

  public constructor(args: LtiRepositoryErrorConstructor<InnerError>) {
    super(LtiRepositoryError.resolveHttpStatusCode(args.type));
    this.type = args.type;
    this.cause = args.cause;
    this.name = LtiRepositoryError.name;

    if (args.type === "NotFound") this.subject = args.subject;
  }
}
