import { ILtilibError, LtilibError } from "./ltilib.error";

export interface IOAuthError<ErrorCode> extends Omit<ILtilibError, "message"> {
  reason: ErrorCode;
  description?: string;
  errorPageUri?: URL;
  httpStatusCode: number;
  headers?: Record<string, string> | Headers;
}

/**
 * An error as specified by [RFC 6749].
 *
 * [RFC 6749]: https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export abstract class OAuthError<ErrorCode extends string>
  extends LtilibError
  implements IOAuthError<ErrorCode>
{
  public readonly reason: ErrorCode;
  public readonly description?: string;
  public readonly errorPageUri?: URL;
  /**
   * Headers that must be set to the HTTP response from the framework under usage.
   */
  public readonly headers: Headers;

  public constructor(args: IOAuthError<ErrorCode>, errorOptions?: ErrorOptions) {
    const { httpStatusCode, reason, description, errorPageUri, headers } = args;

    super(httpStatusCode, description || reason, errorOptions);

    this.reason = reason;
    this.description = description;
    this.errorPageUri = errorPageUri;
    this.headers = new Headers(headers ?? {});
  }

  protected _present() {
    return {
      error: this.reason,
      error_description: this.description,
      error_uri: this.errorPageUri?.toString(),
    };
  }

  /**
   * Formats this error in a JSON response as specified by OAuth 2.0 protocol.
   */
  public abstract present(): object | undefined;
}
