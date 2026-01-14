import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiToolDeployment } from "./entities/lti-tool-deployment.entity";

export abstract class LtiToolsDeploymentsRepository {
  public abstract save(
    deployment: LtiToolDeployment,
  ): Promise<Either<IrrecoverableError, void>>;

  public abstract findManyByToolId(
    toolId: string,
  ): Promise<Either<IrrecoverableError, LtiToolDeployment[]>>;

  public abstract delete(
    deploymentId: UUID,
  ): Promise<Either<IrrecoverableError, void>>;
}
