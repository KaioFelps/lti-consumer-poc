import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository.js";
import { Platform } from "$/core/platform.js";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository.js";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository.js";
import { LtiLineItemsRepository } from "../repositories/line-items.repository.js";
import { AGSExecutorParams, AGServicesExecutor } from "./index.js";
import {
  CreateLineItemServiceParams,
  CreateService,
} from "./line-item/create-line-item.service.js";
import {
  DeleteLineItemServiceParams,
  DeleteService,
} from "./line-item/delete-line-item.service.js";
import {
  FetchFromContainerService,
  FetchLineItemsFromContainerParams,
} from "./line-item/fetch-line-items-from-container.service.js";
import { FindLineItemParams, FindService } from "./line-item/find-line-item.service.js";
import { UpdateLineItemParams, UpdateService } from "./line-item/update-line-item.service.js";

export class LtiLineItemServices<
  CustomContextType extends string = never,
> extends AGServicesExecutor {
  private readonly createService: CreateService<CustomContextType>;
  private readonly findService: FindService;
  private readonly containerService: FetchFromContainerService;
  private readonly updateService: UpdateService;
  private readonly deleteService: DeleteService;

  public constructor(
    platform: Platform,
    resourceLinksRepo: LtiResourceLinksRepository,
    externalResourcesRepo: ExternalLtiResourcesRepository,
    lineItemsRepo: LtiLineItemsRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
  ) {
    super(deploymentsRepo);
    this.findService = new FindService(platform, lineItemsRepo);
    this.updateService = new UpdateService(platform, lineItemsRepo, externalResourcesRepo);
    this.deleteService = new DeleteService(lineItemsRepo);
    this.containerService = new FetchFromContainerService(lineItemsRepo, platform);
    this.createService = new CreateService(
      platform,
      resourceLinksRepo,
      externalResourcesRepo,
      lineItemsRepo,
    );
  }

  public async create(
    params: AGSExecutorParams<CreateLineItemServiceParams<CustomContextType>, CustomContextType>,
  ) {
    return await this.executeService(this.createService, params);
  }

  public async find(params: AGSExecutorParams<FindLineItemParams, CustomContextType>) {
    return await this.executeService(this.findService, params);
  }

  public async fetchFromContainer(
    params: AGSExecutorParams<FetchLineItemsFromContainerParams, unknown>,
  ) {
    return await this.executeService(this.containerService, params);
  }

  public async update(params: AGSExecutorParams<UpdateLineItemParams, unknown>) {
    return await this.executeService(this.updateService, params);
  }

  public async delete(params: AGSExecutorParams<DeleteLineItemServiceParams, unknown>) {
    return await this.executeService(this.deleteService, params);
  }
}
