import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { LtiToolsDeploymentsRepository } from "@/lti/tools/lti-tools-deployments.repository";

type Params = {
  deploymentId: UUID;
};

@Injectable()
export class RemoveToolDeploymentService {
  @Inject()
  private readonly deploymentsRepo: LtiToolsDeploymentsRepository;

  public async exec({ deploymentId }: Params) {
    return await this.deploymentsRepo.delete(deploymentId);
  }
}
