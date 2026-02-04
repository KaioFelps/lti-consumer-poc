import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class LaunchNotFoundError extends ResourceNotFoundError {
  public constructor(launchId: string) {
    super({
      errorMessageIdentifier: "lti:launch:repository:launch-not-found",
      messageParams: { launchId },
    });
  }
}
