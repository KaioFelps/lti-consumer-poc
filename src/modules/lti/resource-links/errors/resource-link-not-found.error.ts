import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class ResourceLinkNotFoundError extends ResourceNotFoundError {
  public constructor(resourceLinkId: string) {
    super({
      errorMessageIdentifier:
        "lti:resource-links:find-by-id:resource-not-found",
      messageParams: { resourceLinkId },
    });
  }
}
