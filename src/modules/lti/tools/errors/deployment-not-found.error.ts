import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

type ConstructorParams = { toolId: string } | { deploymentId: string };

export class DeploymentNotFoundError extends ResourceNotFoundError {
  public constructor(params: ConstructorParams) {
    const errorMessageIdentifier =
      "deploymentId" in params
        ? "lti:tools-deployments-repository:find-deployment-by-id:resource-not-found"
        : "lti:tools-deployments-repository:find-most-appropriate-for-tool:resource-not-found";

    super({
      errorMessageIdentifier,
      messageParams: params,
    });
  }
}
