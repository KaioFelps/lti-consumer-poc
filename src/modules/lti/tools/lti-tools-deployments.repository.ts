import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiToolDeployment } from "./entities/lti-tool-deployment.entity";

export abstract class LtiToolsDeploymentsRepository {
  /**
   * Message strings identifiers for possible errors originated from methods within
   * this repository. Implementations inherit these messages and therefore does not
   * need to write hard-coded strings identifiers, avoiding spelling errors or
   * inconsistency.
   */
  protected static messages = {
    findById: {
      resourceNotFound: "lti:tools-deployments-repository:find-deployment-by-id:resource-not-found",
    },
  } as const;

  public abstract save(deployment: LtiToolDeployment): Promise<Either<IrrecoverableError, void>>;

  public abstract findManyByToolId(
    toolId: string,
  ): Promise<Either<IrrecoverableError, LtiToolDeployment[]>>;

  public abstract delete(deploymentId: UUID): Promise<Either<IrrecoverableError, void>>;

  public abstract findById(
    deploymentId: UUID,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiToolDeployment>>;
}
