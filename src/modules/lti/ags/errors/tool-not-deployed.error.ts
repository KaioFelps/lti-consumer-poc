import { ForbiddenError } from "@/core/errors/forbidden.error";

export class ToolNotDeployedError extends ForbiddenError {
  public constructor(toolId: string) {
    super({
      errorMessageIdentifier: "lti:ags:tool-not-deployed",
      messageParams: { toolId },
    });
  }
}
