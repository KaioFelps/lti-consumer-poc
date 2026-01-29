interface ILtiRepositoryError<InnerError> {
  type: "ExternalError" | "NotFound";
  cause: InnerError;
}

export class LtiRepositoryError<InnerError = unknown>
  extends Error
  implements ILtiRepositoryError<InnerError>
{
  public readonly type: "ExternalError" | "NotFound";
  public readonly cause: InnerError;

  public constructor({ cause, type }: ILtiRepositoryError<InnerError>) {
    super();
    this.type = type;
    this.cause = cause;
    this.name = LtiRepositoryError.name;
  }
}
