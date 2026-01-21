import { Injectable } from "@nestjs/common";
import { LtiToolsDeploymentsRepository } from "@/lti/tools/lti-tools-deployments.repository";

type Params = {
  deploymentId: string;
};

@Injectable()
export class FindDeploymentByIdService {
  public constructor(
    private deploymentsRepository: LtiToolsDeploymentsRepository,
  ) {}

  public async exec({ deploymentId }: Params) {
    return await this.deploymentsRepository.findById(deploymentId);
  }
}
