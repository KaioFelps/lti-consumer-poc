import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import guards from "$/advantage/guards";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Context } from "$/core/context";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { LineItemService } from "./base-service";
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

export class LtiLineItemServices<CustomContextType extends string = never> {
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
    private readonly deploymentsRepo: LtiToolDeploymentsRepository,
  ) {
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

  protected async executeService<
    S extends LineItemService,
    Params = S extends LineItemService<infer TParams, unknown, unknown> ? TParams : never,
    ReturnType = S extends LineItemService<unknown, infer TReturn, unknown> ? TReturn : never,
    ErrorType = S extends LineItemService<unknown, unknown, infer TErrors> ? TErrors : never,
  >(
    service: LineItemService<Params, ReturnType, ErrorType>,
    params: Params & BasicRequestValidationParams<unknown>,
  ) {
    return await pipe(
      this.checkScopes(params.tool, service),
      te.chainW(() => this.checkAcceptHeader(params.acceptHeader, service)),
      te.chainW(() => this.checkContentTypeHeader(params.contentTypeHeader, service)),
      te.chainW(() =>
        guards.ensureToolIsDeployedInContext(params.tool, params.context, this.deploymentsRepo),
      ),
      te.chainW(() => () => service.execute(params)),
    )();
  }

  private checkScopes(tool: LtiTool, service: LineItemService) {
    const scopes = service.getRequiredScopes();
    if (!scopes || scopes.length === 0) return te.right(undefined);
    return guards.ensureHasAnyScope({ tool, requiredScopes: scopes });
  }

  private checkAcceptHeader(acceptHeader: string | undefined, service: LineItemService) {
    const requiredMediaType = service.getRequiredAcceptHeader();
    if (!requiredMediaType) return te.right(undefined);
    return guards.ensureMediaTypeIsAccepted(acceptHeader, requiredMediaType);
  }

  private checkContentTypeHeader(contentTypeHeader: string | undefined, service: LineItemService) {
    const requiredContentType = service.getRequiredContentType();
    if (!requiredContentType) return te.right(undefined);
    return guards.ensureContentTypeIsValid(contentTypeHeader, requiredContentType);
  }
}
