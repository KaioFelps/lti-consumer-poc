import { LtilibError } from "./bases/ltilib.error";
import { LtiRepositoryError } from "./repository.error";

/**
 * This error occurs when tool could not be found due to some external error, not because it doesn't exist.
 * It means the user must not be redirected to `redirect_uri`, since it couldn't be checked and nor can it
 * be assumed that it would be unsafe, since it's unknown whether the tool exists or not.
 *
 * This *is* an internal server error.
 */
export class CouldNotFindToolDueToExternalRepositoryError<
  ExternalError = unknown,
> extends LtilibError {
  public constructor(repositoryExternalError: LtiRepositoryError<ExternalError>) {
    super(500, "Could not find LTI Tool record due to some server error.", {
      cause: repositoryExternalError,
    });
  }
}
