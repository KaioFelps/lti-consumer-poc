import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ILtiScore, LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import {
  InaccessibleLineItemError,
  MissingPlatformAgsConfigurationError,
} from "$/assignment-and-grade/errors";
import { LtiLineItemsRepository, LtiScoresRepository } from "$/assignment-and-grade/repositories";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";
import { AGSExecutorParams, AGServiceBase, AGServicesExecutor } from "..";

type PublishScoreServiceParams = {
  lineItemId: LtiLineItem["id"];
  scoreGiven?: number | undefined;
  scoreMaximum?: number | undefined;
  comment?: string | null;
  context: Context<unknown>;
  tool: LtiTool;
} & Omit<ILtiScore, "score" | "comment">;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiScoreServices.publish `LtiScoreServices.publish`} instead.
 *
 * @internal
 */
class PublishService extends AGServiceBase {
  public constructor(
    private readonly scoresRepository: LtiScoresRepository,
    private readonly lineItemsRepository: LtiLineItemsRepository,
  ) {
    super();
  }

  public execute({
    tool,
    context,
    lineItemId,
    userId,
    scoreGiven,
    scoreMaximum,
    ...scorePayload
  }: PublishScoreServiceParams) {
    return pipe(
      te.Do,
      te.chainFirstW(() => this.ensureToolCanPublishToLineItem(tool, lineItemId, context)),
      te.bindW("score", () =>
        pipe(
          LtiScore.create({
            ...scorePayload,
            userId,
            score: { given: scoreGiven, maximum: scoreMaximum },
          }),
          te.fromEither,
        ),
      ),
      te.bindW("existingScore", () => this.findExistingScore(lineItemId, userId)),
      te.chainEitherKW(({ score, existingScore }) =>
        existingScore ? existingScore.update(score) : e.right(score),
      ),
      te.chainW((score) => () => this.scoresRepository.upsert(score, lineItemId)),
      te.map(
        () => new HttpResponseWrapper<undefined, undefined>(undefined, 204, undefined, undefined),
      ),
    )();
  }

  private ensureToolCanPublishToLineItem(
    tool: LtiTool,
    lineItemId: LtiLineItem["id"],
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

  private findExistingScore(lineItemId: LtiLineItem["id"], userId: string) {
    return pipe(
      () => this.scoresRepository.findByLineItemIdAndUserId(lineItemId, userId),
      te.orElse((error) => (error.type === "ExternalError" ? te.left(error) : te.right(undefined))),
    );
  }

  public getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return [AssignmentAndGradeServiceScopes.Score];
  }

  public getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }

  public getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.Score;
  }
}

export class LtiScoreServices<CustomContextType extends string = never> extends AGServicesExecutor {
  private readonly publishService: PublishService;

  public constructor(
    private readonly platform: Platform,
    scoresRepository: LtiScoresRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
    lineItemsRepository: LtiLineItemsRepository,
  ) {
    super(deploymentsRepo);
    this.publishService = new PublishService(scoresRepository, lineItemsRepository);
  }

  public async publish(params: AGSExecutorParams<PublishScoreServiceParams, CustomContextType>) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    return await this.executeService(this.publishService, params);
  }
}
