import { Inject, Injectable } from "@nestjs/common";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiTool } from "../entities/lti-tool.entity";
import { LtiToolDeployment } from "../entities/lti-tool-deployment.entity";
import { LtiToolsDeploymentsRepository } from "../lti-tools-deployments.repository";

type Params = {
  tool: LtiTool;
  label: string;
};

type PossibleErrors = IrrecoverableError;

@Injectable()
export class DeployToolService {
  @Inject()
  private readonly deploymentRepo: LtiToolsDeploymentsRepository;

  public async exec({
    tool,
    label,
  }: Params): Promise<Either<PossibleErrors, LtiToolDeployment>> {
    const deployment = LtiToolDeployment.create({
      label,
      toolId: tool.record.id,
    });

    return pipe(
      await this.deploymentRepo.save(deployment),
      either.map(() => deployment),
    );
  }
}
