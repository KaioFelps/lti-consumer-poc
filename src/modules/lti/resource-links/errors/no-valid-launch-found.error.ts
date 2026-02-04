import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class NoValidLaunchFoundError extends ResourceNotFoundError {
  public constructor(launchId: string) {
    super({
      errorMessageIdentifier: "lti:launch:no-valid-launch-found-error",
      messageParams: { launchId },
    });
  }
}
