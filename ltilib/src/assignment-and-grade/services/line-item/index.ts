import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { CreateLineItemServiceParams, CreateService } from "./create-line-item.service";
import { FindLineItemParams, FindService } from "./find-line-item.service";

export class LtiLineItemServices {
  private readonly createService: CreateService;
  private readonly findService: FindService;

  public constructor(
    platform: Platform,
    resourceLinksRepo: LtiResourceLinksRepository,
    externalResourcesRepo: ExternalLtiResourcesRepository,
    lineItemsRepo: LtiLineItemsRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
  ) {
    this.findService = new FindService(platform, lineItemsRepo, deploymentsRepo);

    this.createService = new CreateService(
      platform,
      resourceLinksRepo,
      externalResourcesRepo,
      lineItemsRepo,
      deploymentsRepo,
    );
  }

  public async create(params: CreateLineItemServiceParams) {
    return await this.createService.execute(params);
  }

  public async find(params: FindLineItemParams) {
    return await this.findService.execute(params);
  }
}
