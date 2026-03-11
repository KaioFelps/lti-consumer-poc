import { Either } from "fp-ts/lib/Either";
import { Context } from "../context";
import { LtiRepositoryError } from "../errors/repository.error";
import { LtiTool } from "../tool";
import { LtiToolDeployment } from "../tool-deployment";

export abstract class LtiToolDeploymentsRepository {
  /**
   * Tries to find a deployment of a LTI tool in given {@link Context `Context`} **or**
   * a global deployment.
   *
   * Note that a global deployment is a deployment with no associated {@link Context `Context`}.
   *
   * @param toolId the identifier of the tool's of which deployments are to be looked up.
   * @param contextId  the identifier of the specific context to which the LTI tool should belong.
   */
  public abstract findDeploymentInContextOrGlobal(
    toolId: LtiTool["id"],
    contextId: Context["id"],
  ): Promise<Either<LtiRepositoryError, LtiToolDeployment>>;
}
