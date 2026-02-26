import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiToolDeployment } from "$/core/tool-deployment";
import { ToolRecord } from "$/registration/tool-record";

export class InMemoryLtiToolDeploymentsRepository implements LtiToolDeploymentsRepository {
  public deployments: LtiToolDeployment[] = [];

  public async findDeploymentInContextOrGlobal(
    toolId: ToolRecord["id"],
    contextId: Context["id"],
  ): Promise<Either<LtiRepositoryError, LtiToolDeployment>> {
    const deployment = this.deployments.find((deployment) => {
      const belongsToTool = deployment.toolId === toolId;
      const isGlobalOrInContext = !deployment.contextId || deployment.contextId === contextId;
      return belongsToTool && isGlobalOrInContext;
    });

    if (deployment) return e.right(deployment);

    return e.left(
      new LtiRepositoryError({
        subject: LtiToolDeployment.name,
        type: "NotFound",
        cause: undefined,
      }),
    );
  }
}
