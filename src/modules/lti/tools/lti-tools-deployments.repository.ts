import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiToolDeploymentsRepository as LtilibLtiToolsDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { ContextConcreteType } from "../ags/enums/context-concrete-type";
import { LtiToolDeployment } from "./entities/lti-tool-deployment.entity";

export abstract class LtiToolsDeploymentsRepository extends LtilibLtiToolsDeploymentsRepository {
  public abstract save(deployment: LtiToolDeployment): Promise<Either<IrrecoverableError, void>>;

  public abstract findManyByToolId(
    toolId: string,
  ): Promise<Either<IrrecoverableError, LtiToolDeployment[]>>;

  public abstract delete(deploymentId: UUID): Promise<Either<IrrecoverableError, void>>;

  public abstract findById(
    deploymentId: UUID,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiToolDeployment>>;

  public abstract findMostAppropriateDeploymentForTool(
    toolId: string,
    contextConcreteId: string,
    contextConcreteType: ContextConcreteType,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiToolDeployment>>;
}
