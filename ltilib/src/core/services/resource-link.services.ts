import { LtiResourceLinksRepository } from "../repositories/resource-links.repository";

type GetResourceLinksOfToolParams = {
  deploymentId: string;
};

export class LtiResourceLinkServices {
  public constructor(
    private readonly resourceLinksRepository: LtiResourceLinksRepository,
  ) {}

  public async getResourceLinksFromDeployment({
    deploymentId,
  }: GetResourceLinksOfToolParams) {
    const resourceLinks = await this.resourceLinksRepository.findMany({
      withDeploymentId: deploymentId,
    });

    return resourceLinks;
  }
}
