import { LtiResourceLinksRepository } from "../repositories/resource-links.repository";

type GetResourceLinksOfToolParams = {
  deploymentId: string;
};

export class LtiResourceLinkServices<ExternalError> {
  public constructor(
    private readonly resourceLinksRepository: LtiResourceLinksRepository<ExternalError>,
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
