import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { ToolRecord } from "$/registration/tool-record";

export type VerifyRedirectUriParams = {
  redirectUri: string;
  tool: ToolRecord;
};

export class VerifyRedirectionUriService {
  /**
   * Ensures the `redirectUri` is safe to redirect the current user to.
   * It **must** be the first verification to be made during an authentication flow,
   * since further errors are redirections to `redirectUri`.
   */
  public async execute({
    redirectUri,
    tool,
  }: VerifyRedirectUriParams): Promise<Either<InvalidRedirectUriError, URL>> {
    if (!tool.uris.redirect.includes(redirectUri)) {
      return e.left(
        new InvalidRedirectUriError("Given redirect URI is not registered.", redirectUri),
      );
    }

    return pipe(
      e.tryCatch(
        () => new URL(redirectUri),
        (_error) => new InvalidRedirectUriError("Given redirect URI is not valid.", redirectUri),
      ),
    );
  }
}
