import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";
import { ILtiScore, LtiLineItem, LtiScore } from "$/assignment-and-grade/entities/index.js";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors.js";
import {
  LtiLineItemsRepository,
  LtiScoresRepository,
} from "$/assignment-and-grade/repositories.js";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes.js";
import { Context } from "$/core/context.js";
import { HttpResponseWrapper } from "$/core/http/response-wrapper.js";
import { Platform } from "$/core/platform.js";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository.js";
import { LtiTool } from "$/core/tool.js";
import { AGSExecutorParams, AGServiceBase, AGServicesExecutor } from "./index.js";

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
    private readonly platform: Platform,
    private readonly scoresRepository: LtiScoresRepository,
    lineItemsRepository: LtiLineItemsRepository,
  ) {
    super(lineItemsRepository);
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
    const strictTimestampValidation = this.platform.agsConfiguration?.strictTimestampValidation;
    return pipe(
      te.Do,
      te.chainFirstW(() => this.ensureToolHasAccessToLineItem(lineItemId, tool, context)),
      te.bindW("score", () =>
        pipe(
          LtiScore.create(
            {
              ...scorePayload,
              userId,
              score: { given: scoreGiven, maximum: scoreMaximum },
            },
            { strictTimestampValidation },
          ),
          te.fromEither,
        ),
      ),
      te.bindW("existingScore", () => this.findExistingScore(lineItemId, userId)),
      te.chainEitherKW(({ score, existingScore }) =>
        existingScore ? existingScore.update(score) : e.right(score),
      ),
      te.chainW((score) =>
        pipe(
          () => this.scoresRepository.upsert(score, lineItemId),
          te.map(() => score),
        ),
      ),
      te.map(
        (score) => new HttpResponseWrapper<LtiScore, undefined>(undefined, 204, score, undefined),
      ),
    )();
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
    this.publishService = new PublishService(platform, scoresRepository, lineItemsRepository);
  }

  public async publish(params: AGSExecutorParams<PublishScoreServiceParams, CustomContextType>) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    return await this.executeService(this.publishService, params);
  }
}
