import { array as ARR, either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import utils from "$/advantage/utils";
import { ResultsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors";
import {
  PresentedLtiResult,
  presentLtiResult,
} from "$/assignment-and-grade/presenters/result.presenter";
import { LtiLineItemsRepository, LtiScoresRepository } from "$/assignment-and-grade/repositories";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";
import { AGSExecutorParams, AGServiceBase, AGServicesExecutor } from "..";

type FetchResultsServiceParams = {
  /**
   * The ID of the line item to which the scores results belong.
   */
  lineItemId: LtiLineItem["id"];
  /**
   * The context to which the line item (referred by `lineItemId`) belongs.
   */
  context: Context<unknown>;
  /**
   * The LTI tool that is requesting the results.
   */
  tool: LtiTool;
  /**
   * The default limit to apply when filter contains no explicit limit.
   */
  defaultLimit: number;
  /**
   * The ceil of `filters.limit`.
   */
  maxLimit?: number;
  filters: ResultsContainerFilters;
};

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiResultServices.fetchResults `LtiScoreServices.fetchResults`} instead.
 *
 * @internal
 */
class FetchResultsService extends AGServiceBase {
  public constructor(
    private readonly platform: Platform,
    private readonly scoresRepository: LtiScoresRepository,
    lineItemsRepository: LtiLineItemsRepository,
  ) {
    super(lineItemsRepository);
  }

  public execute({
    lineItemId,
    defaultLimit,
    maxLimit,
    filters,
    context,
    tool,
  }: FetchResultsServiceParams) {
    lineItemId = lineItemId.toString();
    const resolvedLimit = this.resolveLimit(defaultLimit, maxLimit, filters.limit);

    return pipe(
      te.Do,
      te.chainFirstW(() => this.ensureToolHasAccessToLineItem(lineItemId, tool, context)),
      te.bindW("scores", () => this.findScoresCollection(lineItemId, resolvedLimit, filters)),
      te.let("resolvedScoresData", ({ scores }) =>
        this.ensureNoUnscoredRecords(scores.values, scores.count),
      ),
      te.bindW("presentedResults", ({ resolvedScoresData }) =>
        this.presentResults(lineItemId, context, {
          values: resolvedScoresData.filteredScores,
          count: resolvedScoresData.total,
        }),
      ),
      te.bindW("response", ({ presentedResults }) => this.prepareHttpResponse(presentedResults)),
      te.chainFirstEitherKW(({ response, scores }) =>
        this.enrichResponseWithLinkHeader({
          agsConfig: this.platform.agsConfiguration!,
          context,
          filters,
          paginatedData: scores,
          resolvedLimit,
          response,
        }),
      ),
      te.map(({ response }) => response),
    )();
  }

  private presentResults(
    lineItemId: string,
    context: Context<unknown>,
    data: LtiRepositoryPaginatedResponse<LtiScore>,
  ) {
    return pipe(
      data.values,
      ARR.traverse(e.Applicative)((score) =>
        presentLtiResult(lineItemId, score, context, this.platform),
      ),
      te.fromEither,
    );
  }

  private findScoresCollection(
    lineItemId: string,
    limit: number,
    filters: ResultsContainerFilters,
  ) {
    return filters.userId === undefined
      ? () => this.scoresRepository.fetchManyByLineItemId(lineItemId, limit, filters.page)
      : this.findSpecificResult(lineItemId, filters.userId);
  }

  private prepareHttpResponse(results: PresentedLtiResult[]) {
    const headers = { "content-type": LtiAdvantageMediaType.ResultContainer };
    const response = new HttpResponseWrapper(results, 200, undefined, headers);
    return te.right(response);
  }

  /**
   * Prepares and sets the next `Link` HTTP header if there is a next page, as per
   * [section 3.3.6 of LTI AGS specification].
   *
   * [section 3.3.6 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#container-request-filters-0
   */
  private enrichResponseWithLinkHeader({
    agsConfig,
    context,
    filters,
    paginatedData,
    resolvedLimit,
    response,
  }: {
    filters: ResultsContainerFilters;
    response: HttpResponseWrapper<undefined, PresentedLtiResult[]>;
    paginatedData: LtiRepositoryPaginatedResponse<LtiScore>;
    agsConfig: Platform.LtiAssignmentAndGradeServicesConfig;
    context: Context<unknown>;
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

  private findSpecificResult(
    lineItemId: string,
    userId: string,
  ): TaskEither<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiScore>> {
    return pipe(
      () => this.scoresRepository.findByLineItemIdAndUserId(lineItemId, userId),
      te.map((score) => ({ count: 1, values: [score] })),
      te.orElse((error) =>
        error.type === "NotFound" ? te.right({ count: 0, values: [] }) : te.left(error),
      ),
    );
  }

  /**
   * Performs a soft filtering of scores that have no actual score, also virtually resolving
   * the count. This is just a measure to ensure consistency regarding the presentation of
   * unscored results, however, it is a responsibility of the repository to not return unscored
   * results in the first place, since this method might cause pagination mismatches. (E.g.,
   * the next page might be empty or contain repeated results, since the actual total count of scores
   * was no longer the same as the actual number of scores returned after filtering.)
   */
  private ensureNoUnscoredRecords(scores: LtiScore[], count: number) {
    let removedScores = 0;
    const filteredScores: LtiScore[] = [];

    for (const score of scores) {
      if (score.score === undefined || score.score === null) {
        removedScores++;
        continue;
      }
      filteredScores.push(score);
    }

    return { filteredScores, total: count - removedScores };
  }

  private resolveLimit(defaultLimit: number, maxLimit?: number, filterLimit?: number) {
    let resolvedLimit = filterLimit ?? defaultLimit;
    if (maxLimit) resolvedLimit = Math.min(resolvedLimit, maxLimit);
    return resolvedLimit;
  }

  public getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return [AssignmentAndGradeServiceScopes.ResultReadonly];
  }

  public getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.ResultContainer;
  }

  public getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }
}

export class LtiResultServices<
  CustomContextType extends string = never,
> extends AGServicesExecutor {
  private readonly fetchService: FetchResultsService;

  public constructor(
    private readonly platform: Platform,
    scoresRepository: LtiScoresRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
    lineItemsRepository: LtiLineItemsRepository,
  ) {
    super(deploymentsRepo);
    this.fetchService = new FetchResultsService(platform, scoresRepository, lineItemsRepository);
  }

  public async fetchResults(
    params: AGSExecutorParams<FetchResultsServiceParams, CustomContextType>,
  ) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    return await this.executeService(this.fetchService, params);
  }
}
