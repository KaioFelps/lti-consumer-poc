import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { CreateLineItemServiceParams, CreateService } from "./create-line-item.service";
import { DiscoverLineItemServiceParams, DiscoverService } from "./discover-line-item.service";

export class LtiLineItemServices {
  private readonly createService: CreateService;
  private readonly discoverService: DiscoverService;

  public constructor(
    platform: Platform,
    resourceLinksRepo: LtiResourceLinksRepository,
    externalResourcesRepo: ExternalLtiResourcesRepository,
    lineItemsRepo: LtiLineItemsRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
  ) {
    this.discoverService = new DiscoverService(lineItemsRepo);

    this.createService = new CreateService(
      platform,
      resourceLinksRepo,
      externalResourcesRepo,
      lineItemsRepo,
      deploymentsRepo,
      this.discoverService,
    );
  }

  public async discover(params: DiscoverLineItemServiceParams) {
    return await this.discoverService.execute(params);
  }

  public async create(params: CreateLineItemServiceParams) {
    return await this.createService.execute(params);
  }
}
