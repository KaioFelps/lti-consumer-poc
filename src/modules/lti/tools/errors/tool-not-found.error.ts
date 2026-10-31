import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";

export class ToolNotFoundError extends ResourceNotFoundError {
  public constructor(toolId: string) {
    super({
      errorMessageIdentifier: "lti:tool-not-found-by-id",
      messageParams: { toolId },
    });
  }
}
