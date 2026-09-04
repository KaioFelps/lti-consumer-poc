import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Context } from "$/core/context";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { AGServicesExecutor } from "..";
import { CreateLineItemServiceParams, CreateService } from "./create-line-item.service";
import { DeleteLineItemServiceParams, DeleteService } from "./delete-line-item.service";
import {
  FetchFromContainerService,
  FetchLineItemsFromContainerParams,
} from "./fetch-line-items-from-container.service";
import { FindLineItemParams, FindService } from "./find-line-item.service";
import { UpdateLineItemParams, UpdateService } from "./update-line-item.service";

type BasicRequestValidationParams<CustomContextType = never> = {
  tool: LtiTool;
  context: Context<CustomContextType> | undefined;
  acceptHeader: string | undefined;
  contentTypeHeader: string | undefined;
};

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
    params: CreateLineItemServiceParams<CustomContextType> &
      BasicRequestValidationParams<CustomContextType>,
  ) {
    return await this.executeService(this.createService, params);
  }

  public async find(params: FindLineItemParams & BasicRequestValidationParams<CustomContextType>) {
    return await this.executeService(this.findService, params);
  }

  public async fetchFromContainer(
    params: FetchLineItemsFromContainerParams & BasicRequestValidationParams<unknown>,
  ) {
    return await this.executeService(this.containerService, params);
  }

  public async update(params: UpdateLineItemParams & BasicRequestValidationParams<unknown>) {
    return await this.executeService(this.updateService, params);
  }

  public async delete(params: DeleteLineItemServiceParams & BasicRequestValidationParams<unknown>) {
    return await this.executeService(this.deleteService, params);
  }
}
