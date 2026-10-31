import { Inject, Injectable } from "@nestjs/common";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity.js";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity.js";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository.js";

type Params = {
  tool: LtiTool;
  label: string;
};

type PossibleErrors = IrrecoverableError;

@Injectable()
export class DeployToolService {
  @Inject()
  private readonly deploymentRepo: LtiToolsDeploymentsRepository;

  public async exec({ tool, label }: Params): Promise<Either<PossibleErrors, LtiToolDeployment>> {
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
