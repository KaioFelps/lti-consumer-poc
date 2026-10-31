import { either as e, option, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository.js";
import { ILtiLineItem, LtiLineItem } from "$/assignment-and-grade/entities/index.js";
import {
  InaccessibleLineItemError,
  MissingPlatformAgsConfigurationError,
} from "$/assignment-and-grade/errors.js";
import { presentLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter.js";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes.js";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { HttpResponseWrapper } from "$/core/http/response-wrapper.js";
import { Platform } from "$/core/platform.js";
import { LtiTool } from "$/core/tool.js";
import { AGServiceBase } from "../index.js";

export type UpdateLineItemParams = {
  // it must NOT change to the id nor resource link id

  lineItemId: LtiLineItem["id"];
  tool: LtiTool;
  context: Context<unknown>;

  label: string;
  scoreMaximum: number;
  resourceId?: string;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  tag?: string;
  gradesReleased?: boolean;
} & Pick<ILtiLineItem, "customParameters">;

const REQUIRED_SCOPES = [AssignmentAndGradeServiceScopes.Lineitem] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.update `LtiLineItemServices.update`} instead.
 *
 * @internal
 */
export class UpdateService extends AGServiceBase {
  public constructor(
    private readonly platform: Platform,
    lineItemsRepo: LtiLineItemsRepository,
    private readonly externalResourcesRepo: ExternalLtiResourcesRepository,
  ) {
    super(lineItemsRepo);
  }

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return;
  }

  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.LineItem;
  }

  public async execute({
    lineItemId,
    tool,
    context,
    label,
    scoreMaximum,
    endDateTime,
    gradesReleased,
    resourceId,
    startDateTime,
    tag,
    customParameters,
  }: UpdateLineItemParams) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    const { agsConfiguration } = this.platform;

    tag = tag?.trim() || undefined;
    resourceId = resourceId?.trim() || undefined;

    const { resolvedEndDate, resolvedStartDate } = this.getResolvedDates(
      agsConfiguration,
      startDateTime,
      endDateTime,
    );

    return await pipe(
      this.findOrCreateExternalResource(resourceId, tool.id),
      te.chainEitherKW((externalResource) =>
        LtiLineItem.UpdateRecord.create({
          id: lineItemId,
          tag,
          label,
          scoreMaximum,
          gradesReleased,
          externalResource,
          customParameters,
          endDateTime: resolvedEndDate,
          startDateTime: resolvedStartDate,
        }),
      ),
      te.chainW((record) => () => this.lineItemsRepository.update(record, tool, context)),
      te.mapLeft((error) =>
        error instanceof LtiRepositoryError && error.type === "NotFound"
          ? new InaccessibleLineItemError(lineItemId, error)
          : error,
      ),
      te.chainW((lineItem) => this.presentLineItem(lineItem, context)),
    )();
  }

  private findOrCreateExternalResource(resourceId: string | undefined, toolId: string) {
    return pipe(
      option.fromNullable(resourceId),
      option.traverse(te.ApplicativeSeq)(
        (resourceId) => () =>
          this.externalResourcesRepo.findOrCreateByExternalId(resourceId, toolId),
      ),
      te.map(option.toUndefined),
    );
  }

  private presentLineItem(lineItem: LtiLineItem, context: Context<unknown>) {
    const headers = { "Content-Type": LtiAdvantageMediaType.LineItem };

    return pipe(
      presentLtiLineItem(lineItem, context, this.platform),
      te.fromEither,
      te.map(
        (presented) => new HttpResponseWrapper<LtiLineItem>(presented, 201, lineItem, headers),
      ),
    );
  }
}
