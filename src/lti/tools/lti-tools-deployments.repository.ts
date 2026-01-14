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
}
