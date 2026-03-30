import { array as ARR, either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import utils from "$/advantage/utils";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { presentLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiTool } from "$/core/tool";
import { ILineItemService } from ".";

export type FetchLineItemsFromContainerParams = {
  /**
   * Container request filters as per [section 3.2.4 of LTI AGS specification].
   *
   * [section 3.2.4 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#container-request-filters
   */
  filters: LineItemsContainerFilters;
  defaultLimit: number;
  context: Context;
  tool: LtiTool;
};

const REQUIRED_SCOPES = [
  AssignmentAndGradeServiceScopes.LineitemReadonly,
  AssignmentAndGradeServiceScopes.Lineitem,
] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.fetchFromContainer `LtiLineItemServices.fetchFromContainer`} instead.
 *
 * @internal
 */
export class FetchFromContainerService implements ILineItemService {
  public constructor(
    private readonly lineItemsRepo: LtiLineItemsRepository,
    private readonly platform: Platform,
  ) {}

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.LineItemContainer;
  }

  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }

  public async execute({
    filters,
    context,
    tool,
    defaultLimit,
  }: FetchLineItemsFromContainerParams) {
    const resolvedLimit = filters.limit ?? defaultLimit;

    // forces the page to be 1-based indexed
    filters.page = Math.max(1, filters.page);

    return pipe(
      te.Do,
      te.bindW("agsConfig", () => utils.extractAgsConfigurationAsTask(this.platform)),
      te.bindW("lineItemsResponse", () => this.getLineItems(context, tool, filters, resolvedLimit)),
      te.bindW("lineItems", ({ lineItemsResponse }) => te.right(lineItemsResponse.values)),
      te.bindW("presentedLineItems", ({ lineItems }) => this.presentLineItems(lineItems, context)),
      te.bindW("response", ({ lineItems, presentedLineItems }) =>
        this.prepareHttpResponse(lineItems, presentedLineItems),
      ),
      te.chainFirstEitherKW(({ response, agsConfig, lineItemsResponse }) =>
        this.enrichResponseWithLinkHeader({
          filters,
          response,
          paginatedData: lineItemsResponse,
          agsConfig,
          context,
          resolvedLimit,
        }),
      ),
      te.map(({ response }) => response),
    )();
  }

  private getLineItems(
    context: Context,
    tool: LtiTool,
    { limit: _, page, ...filters }: LineItemsContainerFilters,
    limit: number,
  ) {
    return pipe(
      () => this.lineItemsRepo.fetchWithContainerFilters(context, tool, limit, page, filters),
      te.orElseW((error) => {
        return error.type === "NotFound"
          ? te.right({ values: [], count: 0 } satisfies LtiRepositoryPaginatedResponse<LtiLineItem>)
          : te.left(error);
      }),
    );
  }

  private presentLineItems(lineItems: LtiLineItem[], context: Context) {
    return pipe(
      lineItems,
      ARR.traverse(e.Applicative)((lineItem) =>
        presentLtiLineItem(lineItem, context, this.platform),
      ),
      te.fromEither,
    );
  }

  private prepareHttpResponse(lineItems: LtiLineItem[], presentedLineItems: object[]) {
    const headers = { "content-type": LtiAdvantageMediaType.LineItemContainer };
    const response = new HttpResponseWrapper(presentedLineItems, 200, lineItems, headers);
    return te.right(response);
  }

  /**
   * Prepares and sets the next `Link` HTTP header if there is a next page, as per
   * [section 3.2.4 of LTI AGS specification].
   *
   * [section 3.2.4 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#container-request-filters
   */
  private enrichResponseWithLinkHeader({
    agsConfig,
    context,
    filters,
    paginatedData,
    resolvedLimit,
    response,
  }: {
    filters: LineItemsContainerFilters;
    response: HttpResponseWrapper<LtiLineItem[], object[]>;
    paginatedData: LtiRepositoryPaginatedResponse<LtiLineItem>;
    agsConfig: Platform.LtiAssignmentAndGradeServicesConfig;
    context: Context;
    resolvedLimit: number;
  }) {
    const containerEndpoint = agsConfig.lineItemsContainerEndpoint(context);
    const links = utils.prepareContainerFullLinkHeader(
      filters,
      containerEndpoint,
      filters.page,
      paginatedData,
      resolvedLimit,
    );

    response.headers.set("link", links);
    return e.right(undefined);
  }
}
