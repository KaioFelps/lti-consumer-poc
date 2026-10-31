import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import guards from "$/advantage/guards.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes.js";
import { Context } from "$/core/context.js";
import { Platform } from "$/core/platform.js";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository.js";
import { LtiTool } from "$/core/tool.js";
import { LtiLineItem } from "../entities/index.js";
import { InaccessibleLineItemError } from "../errors.js";
import { LtiLineItemsRepository } from "../repositories.js";

type BasicRequestValidationParams<CustomContextType = never> = {
  tool: LtiTool;
  context: Context<CustomContextType> | undefined;
  acceptHeader: string | undefined;
  contentTypeHeader: string | undefined;
};

export type AGSExecutorParams<T, CustomContextType = never> = T &
  BasicRequestValidationParams<CustomContextType>;

export abstract class AGServiceBase<Params = unknown, ReturnType = unknown, ErrorsType = unknown> {
  public constructor(protected lineItemsRepository: LtiLineItemsRepository) {}

  public abstract execute(params: Params): Promise<Either<ErrorsType, ReturnType>>;
  public abstract getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined;
  public abstract getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined;
  public abstract getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined;

  protected ensureToolHasAccessToLineItem(
    lineItemId: LtiLineItem["id"],
    tool: LtiTool,
    context: Context<unknown>,
  ) {
    return pipe(
      () => this.lineItemsRepository.findById(lineItemId, context),
      te.mapLeft((error) =>
        error.type === "ExternalError" ? error : new InaccessibleLineItemError(lineItemId),
      ),
      te.chainEitherKW((lineItem) => {
        if (lineItem.isAccessibleToTool(tool)) return e.right(lineItem);
        return e.left(new InaccessibleLineItemError(lineItem.id));
      }),
    );
  }

  protected getResolvedDates(
    config: Platform.LtiAssignmentAndGradeServicesConfig,
    startDateTime?: Date | null,
    endDateTime?: Date | null,
  ) {
    const resolvedStartDate =
      startDateTime && config.deadlinesEnabled?.start ? new Date(startDateTime) : undefined;

    const resolvedEndDate =
      endDateTime && config.deadlinesEnabled?.end ? new Date(endDateTime) : undefined;

    return { resolvedStartDate, resolvedEndDate };
  }
}

export abstract class AGServicesExecutor {
  public constructor(private readonly deploymentsRepo: LtiToolDeploymentsRepository) {}

  protected async executeService<
    S extends AGServiceBase,
    Params = S extends AGServiceBase<infer TParams, unknown, unknown> ? TParams : never,
    ReturnType = S extends AGServiceBase<unknown, infer TReturn, unknown> ? TReturn : never,
    ErrorType = S extends AGServiceBase<unknown, unknown, infer TErrors> ? TErrors : never,
  >(
    service: AGServiceBase<Params, ReturnType, ErrorType>,
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

  private checkScopes(tool: LtiTool, service: AGServiceBase) {
    const scopes = service.getRequiredScopes();
    if (!scopes || scopes.length === 0) return te.right(undefined);
    return guards.ensureHasAnyScope({ tool, requiredScopes: scopes });
  }

  private checkAcceptHeader(acceptHeader: string | undefined, service: AGServiceBase) {
    const requiredMediaType = service.getRequiredAcceptHeader();
    if (!requiredMediaType) return te.right(undefined);
    return guards.ensureMediaTypeIsAccepted(acceptHeader, requiredMediaType);
  }

  private checkContentTypeHeader(contentTypeHeader: string | undefined, service: AGServiceBase) {
    const requiredContentType = service.getRequiredContentType();
    if (!requiredContentType) return te.right(undefined);
    return guards.ensureContentTypeIsValid(contentTypeHeader, requiredContentType);
  }
}
