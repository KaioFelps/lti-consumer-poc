import { LtilibError } from "./bases/ltilib.error";

export interface ILtilibOidcRedirectionError {
  redirectUri: URL;
  state: string;
  code: AuthenticationRedirectionError.Code;
  description?: string;
  errorPageUri?: URL;
  httpStatusCode: number;
}

/**
 * Authentication error redirect responses as described as per [OIDC Core 3.1.2.6].
 *
 * [OIDC Core 3.1.2.6]: https://openid.net/specs/openid-connect-core-1_0.html#AuthError
 */
export class AuthenticationRedirectionError
  extends LtilibError
  implements ILtilibOidcRedirectionError
{
  public readonly redirectUri: URL;
  public readonly state: string;
  public readonly code: AuthenticationRedirectionError.Code;
  public readonly description?: string | undefined;
  public readonly errorPageUri?: URL | undefined;

  public constructor(
    _args: Omit<ILtilibOidcRedirectionError, "httpStatusCode">,
    options?: ErrorOptions,
  ) {
    const { redirectUri, state, code, description, errorPageUri } = _args;

    super(302, description || code, options);

    this.code = code;
    this.state = state;
    this.description = description;
    this.redirectUri = redirectUri;
    this.errorPageUri = errorPageUri;
  }

  intoUrl(): URL {
    const url = new URL(this.redirectUri.toString());
    url.searchParams.set("error", this.code);
    url.searchParams.set("state", this.state);

    if (this.description) {
      url.searchParams.set("error_description", this.description);
    }

    if (this.errorPageUri) {
      url.searchParams.set("error_uri", this.errorPageUri.toString());
    }

    return url;
  }
}

export namespace AuthenticationRedirectionError {
  export type Code = "invalid_request" | "server_error" | "login_required";
}
