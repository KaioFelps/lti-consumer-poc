import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ILtiScore, LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors";
import { LtiScoresRepository } from "$/assignment-and-grade/repositories";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { AGSExecutorParams, AGServiceBase, AGServicesExecutor } from "..";

type PublishScoreServiceParams = {
  lineItemId: LtiLineItem["id"];
  scoreGiven: number | undefined;
  scoreMaximum: number | undefined;
} & Omit<ILtiScore, "score">;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiScoreServices.publish `LtiScoreServices.publish`} instead.
 *
 * @internal
 */
class PublishService extends AGServiceBase {
  public constructor(private readonly scoresRepository: LtiScoresRepository) {
    super();
  }

  public execute({
    lineItemId,
    userId,
    scoreGiven,
    scoreMaximum,
    ...scorePayload
  }: PublishScoreServiceParams) {
    return pipe(
      te.Do,
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

export class LtiScoreServices extends AGServicesExecutor {
  private readonly publishService: PublishService;

  public constructor(
    private readonly platform: Platform,
    scoresRepository: LtiScoresRepository,
    deploymentsRepo: LtiToolDeploymentsRepository,
  ) {
    super(deploymentsRepo);
    this.publishService = new PublishService(scoresRepository);
  }

  public async publish(params: AGSExecutorParams<PublishScoreServiceParams>) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    return await this.executeService(this.publishService, params);
  }
}
