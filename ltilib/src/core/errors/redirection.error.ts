import { ClassProperties } from "common/src/types/class-properties";

type RedirectionErrorCode =
  | "invalid_request"
  | "server_error"
  | "login_required";

/**
 * Authentication error redirect responses as described as per [OIDC Core 3.1.2.6].
 *
 * [OIDC Core 3.1.2.6]: https://openid.net/specs/openid-connect-core-1_0.html#AuthError
 */
export class RedirectionError {
  public readonly redirectUri: URL;
  public readonly code: RedirectionErrorCode;
  public readonly description?: string;
  public readonly errorPageUri?: URL;
  public readonly state: string;

  public constructor(args: ClassProperties<RedirectionError>) {
    Object.assign(this, args);
  }

  intoUrl(): URL {
    const url = new URL(this.redirectUri);
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
