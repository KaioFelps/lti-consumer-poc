import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Custom throwable exception to be presented as a OAuth2
 * valid error, since oidc-provider does not expose such error from its
 * `errors` namespace.
 */
export class OIDCServerErrorException extends HttpException {
  public constructor() {
    super(
      {
        error: "server_error",
        error_description: "Something went wrong in our server. Try again later.",
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
