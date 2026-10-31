import { Inject, Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository.js";

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
