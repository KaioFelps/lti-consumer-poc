/**
 * TODO: add unit tests to test generated header is conformant with RFC 6750 specifications.
 */

import { OAuthError } from "./bases/oauth.error";

export interface IOAuthBearerError extends OAuthBearerError.IWWWAuthenticate {
  error: OAuthBearerError.Code;
}

/**
 * A Bearer error implementing the [RFC 6750].
 *
 * [RFC 6750]: https://datatracker.ietf.org/doc/html/rfc6750
 */
export class OAuthBearerError extends OAuthError<OAuthBearerError.Code> {
  /**
   * Pick the most appropriate HTTP status code as specified by [section 3.1 of RFC 6750].
   *
   * [section 3.1 of RFC 6750]: https://datatracker.ietf.org/doc/html/rfc6750#section-3.1
   */
  protected static resolveStatusCode(code: OAuthBearerError.Code) {
    switch (code) {
      case "insufficient_scope":
        return 403;
      case "invalid_request":
        return 400;
      case "invalid_token":
      case "authentication_unaware":
        return 401;
    }
  }

  public constructor({ error, errorDescription, errorUri, realm, scope }: IOAuthBearerError) {
    const shouldOmitErrorDetails = error === "authentication_unaware";

    const authenticateParams = shouldOmitErrorDetails
      ? { realm }
      : { realm, error, errorDescription, errorUri, scope };

    const authenticateHeader = new OAuthBearerError.WWWAuthenticate(authenticateParams);

    super({
      code: error,
      httpStatusCode: OAuthBearerError.resolveStatusCode(error),
      description: errorDescription,
      errorPageUri: errorUri,
      headers: authenticateHeader.intoHeader(),
    });
  }

  public present(): object | undefined {
    if (this.code === "authentication_unaware") return;
    return super._present();
  }
}

export namespace OAuthBearerError {
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc6750#section-3.1 The OAuth 2.0 WWW-Authenticate Response Header Field's Error Codes}
   */
  export type Code =
    | "invalid_request"
    | "invalid_token"
    | "insufficient_scope"
    | "authentication_unaware";

  export interface IWWWAuthenticate {
    realm?: string;
    scope?: string;
    error?: Code;
    errorDescription?: string;
    errorUri?: URL;
  }

  /**
   * A minimal `WWW-Authenticate` header as specified by section 3 of OAuth 2.0.
   * [section 3 of OAuth 2.0]: https://datatracker.ietf.org/doc/html/rfc6750#section-3
   */
  export class WWWAuthenticate implements IWWWAuthenticate {
    public readonly authSchema: string = "Bearer";
    public readonly realm?: string;
    public readonly scope?: string;
    public readonly error?: Code;
    public readonly errorDescription?: string;
    public readonly errorUri?: URL;

    public constructor({ realm, scope, error, errorDescription, errorUri }: IWWWAuthenticate) {
      this.realm = realm;
      this.scope = scope;
      this.error = error;
      this.errorDescription = errorDescription;
      this.errorUri = errorUri;
    }

    public intoHeader() {
      const { realm, scope, error, authSchema, errorDescription, errorUri } = this;

      const params: Record<string, string | undefined> = {
        realm,
        scope,
        error,
        error_description: errorDescription,
        error_uri: errorUri?.toString(),
      };

      let value = Object.entries(params)
        .filter(([_, value]) => Boolean(value))
        .map(([key, value]) => `${key}="${value}"`)
        .join(", ");

      value = `${authSchema} ${value}`;

      return {
        "WWW-Authenticate": value,
      };
    }
  }
}
