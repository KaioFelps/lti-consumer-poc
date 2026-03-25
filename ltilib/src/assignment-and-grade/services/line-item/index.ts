import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import guards from "$/advantage/guards";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { CreateLineItemServiceParams, CreateService } from "./create-line-item.service";
import { FindLineItemParams, FindService } from "./find-line-item.service";

type BasicRequestValidationParams = {
  tool: LtiTool;
  acceptHeader: string | undefined;
  contentTypeHeader: string | undefined;
};

export interface ILineItemService<Params = unknown, ReturnType = unknown, ErrorsType = unknown> {
  execute(params: Params): Promise<Either<ErrorsType, ReturnType>>;
  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined;
  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined;
  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined;
}

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

  public async create({
    acceptHeader,
    contentTypeHeader,
    ...params
  }: CreateLineItemServiceParams & BasicRequestValidationParams) {
    const executorParams = { acceptHeader, contentTypeHeader, tool: params.tool };
    return await this.executeService(executorParams, this.createService, params);
  }

  public async find({
    acceptHeader,
    contentTypeHeader,
    ...params
  }: FindLineItemParams & BasicRequestValidationParams) {
    const executorParams = { acceptHeader, contentTypeHeader, tool: params.tool };
    return await this.executeService(executorParams, this.findService, params);
  }

  protected async executeService<
    S extends ILineItemService,
    Params = S extends ILineItemService<infer TParams, unknown, unknown> ? TParams : never,
    ReturnType = S extends ILineItemService<unknown, infer TReturn, unknown> ? TReturn : never,
    ErrorType = S extends ILineItemService<unknown, unknown, infer TErrors> ? TErrors : never,
  >(
    { acceptHeader, contentTypeHeader, tool }: BasicRequestValidationParams,
    service: ILineItemService<Params, ReturnType, ErrorType>,
    params: Params,
  ) {
    return await pipe(
      this.checkScopes(params.tool, service),
      te.chainW(() => this.checkAcceptHeader(params.acceptHeader, service)),
      te.chainW(() => this.checkContentTypeHeader(params.contentTypeHeader, service)),
      te.chainW(() => () => service.execute(params)),
    )();
  }

  private checkScopes(tool: LtiTool, service: ILineItemService) {
    const scopes = service.getRequiredScopes();
    if (!scopes || scopes.length === 0) return te.right(undefined);
    return guards.ensureHasAnyScope({ tool, requiredScopes: scopes });
  }

  private checkAcceptHeader(acceptHeader: string | undefined, service: ILineItemService) {
    const requiredMediaType = service.getRequiredAcceptHeader();
    if (!requiredMediaType) return te.right(undefined);
    return guards.ensureMediaTypeIsAccepted(acceptHeader, requiredMediaType);
  }

  private checkContentTypeHeader(contentTypeHeader: string | undefined, service: ILineItemService) {
    const requiredContentType = service.getRequiredContentType();
    if (!requiredContentType) return te.right(undefined);
    return guards.ensureContentTypeIsValid(contentTypeHeader, requiredContentType);
  }
}
