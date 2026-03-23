import { IOAuthError, OAuthError } from "./bases/oauth.error";

type ErrorCode =
  | "invalid_deployment"
  | "insufficient_roles"
  | "missing_lti_role"
  | "invalid_context";

type Args = Omit<IOAuthError<ErrorCode>, "httpStatusCode">;

/**
 * A non-normative error that can be returned when a LTI Launch is not
 * valid and thus cannot be successfuly formed.
 */
export class InvalidResourceLinkLaunchError extends OAuthError<ErrorCode> {
  public constructor(args: Args) {
    super({
      ...args,
      httpStatusCode: InvalidResourceLinkLaunchError.resolveHttpStatusCode(args.reason),
    });
  }

  private static resolveHttpStatusCode(errorCode: ErrorCode) {
    switch (errorCode) {
      case "insufficient_roles":
        return 403;
      case "invalid_deployment":
      case "invalid_context":
        return 401;
      case "missing_lti_role":
        return 400;
    }
  }

  public present(): object {
    return super._present();
  }
}
