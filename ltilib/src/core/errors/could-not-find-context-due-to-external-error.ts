import { LtilibError } from "./bases/ltilib.error";
import { LtiRepositoryError } from "./repository.error";

/**
 * This error occurs when the resource link's context could not be found due to some external error, not because it
 * doesn't exist.
 *
 * This *is* an internal server error (platform-wise).
 */
export class CouldNotFindContextDueToExternalRepositoryError<
  ExternalError = unknown,
> extends LtilibError {
  public constructor(repositoryExternalError: LtiRepositoryError<ExternalError>) {
    super(500, "Could not find the resource link's context due to some server error.", {
      cause: repositoryExternalError,
    });
  }
}
