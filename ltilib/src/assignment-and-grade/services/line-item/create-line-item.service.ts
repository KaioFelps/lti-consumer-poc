import { either as e, option as o, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiTool } from "$/core/tool";
import { CannotAttachResourceLinkError } from "../../errors/cannot-attach-resource-link.error";
import { MissingPlatformAgsConfigurationError } from "../../errors/missing-platform-ags-configuration.error";
import { ILtiLineItem, LtiLineItem } from "../../line-item";
import { PresentedLtiLineItem, presentLtiLineItem } from "../../presenters/line-item.presenter";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "../../scopes";
import { ILineItemService, type LtiLineItemServices } from ".";

type RawLineItemsPayload = {
  resourceId?: string;
  resourceLinkId?: string;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  label: string;
  scoreMaximum: number;
  tag?: string;
  gradesReleased?: boolean;
  customParameters?: ILtiLineItem["customParameters"];
};

export type CreateLineItemServiceParams = {
  /**
   * The LTI tool which is trying to create this line item.
   */
  tool: LtiTool;
  context: Context;
} & RawLineItemsPayload;

const REQUIRED_SCOPES = [AssignmentAndGradeServiceScopes.Lineitem] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.create `LtiLineItemServices.create`} instead.
 *
 * @internal
 */
export class CreateService implements ILineItemService {
  public constructor(
    private readonly platform: Platform,
    private readonly resourceLinksRepo: LtiResourceLinksRepository,
    private readonly externalResourcesRepo: ExternalLtiResourcesRepository,
    private readonly lineItemsRepo: LtiLineItemsRepository,
  ) {}

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }
  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.LineItem;
  }

  public async execute({ tool, context, ...args }: CreateLineItemServiceParams) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    const { agsConfiguration } = this.platform;

    args.tag = args.tag?.trim() || undefined;
    args.resourceId = args.resourceId?.trim() || undefined;
    args.resourceLinkId = args.resourceLinkId?.trim() || undefined;

    return await pipe(
      te.Do,
      te.bindW("existingLineItem", () => this.findExistingLineItem(args.resourceId, args.tag)),
      te.bindW("lineItem", ({ existingLineItem }) => {
        if (existingLineItem) return te.right(existingLineItem);
        return this.createNewLineItem(context, tool, agsConfiguration, args);
      }),
      te.bindW("presentedLineItem", ({ lineItem }) => this.presentLineItem(lineItem, context)),
      te.map(
        ({ lineItem, presentedLineItem }) =>
          new HttpResponseWrapper<LtiLineItem, PresentedLtiLineItem>(
            presentedLineItem,
            201,
            lineItem,
            { "Content-Type": LtiAdvantageMediaType.LineItem },
          ),
      ),
    )();
  }

  private presentLineItem(lineItem: LtiLineItem, context: Context) {
    return pipe(presentLtiLineItem(lineItem, context, this.platform), te.fromEither);
  }

  private findExistingLineItem(resourceId: string | undefined, tag: RawLineItemsPayload["tag"]) {
    return pipe(
      o.fromNullable(resourceId),
      o.map((resourceId) => () => this.lineItemsRepo.findByExternalResourceAndTag(resourceId, tag)),
      o.sequence(te.ApplicativePar),
      te.match(
        (error) => {
          if (error.type === "NotFound") return e.right(undefined);
          return e.left(error);
        },
        (lineitem) => e.right(o.toUndefined(lineitem)),
      ),
    );
  }

  private createNewLineItem(
    context: Context,
    tool: LtiTool,
    agsConfig: Platform.LtiAssignmentAndGradeServicesConfig,
    { resourceId, resourceLinkId, ...args }: RawLineItemsPayload,
  ) {
    return pipe(
      te.Do,
      te.apS(
        "externalResource",
        pipe(
          o.fromNullable(resourceId),
          o.map((id) => () => this.externalResourcesRepo.findById(id, tool.id)),
          o.sequence(te.ApplicativePar),
          te.map(o.toUndefined),
        ),
      ),
      te.apS("resourceLink", this.maybeGetAndValidateResourceLink(context, tool, resourceLinkId)),
      te.chainW(({ externalResource, resourceLink }) => {
        const { resolvedEndDate, resolvedStartDate } = this.getResolvedDates(
          agsConfig,
          args.startDateTime,
          args.endDateTime,
        );

        return te.fromEither(
          LtiLineItem.create({
            ...args,
            externalResource,
            resourceLink,
            startDateTime: resolvedStartDate,
            endDateTime: resolvedEndDate,
          }),
        );
      }),
      te.chainW((lineitem) =>
        pipe(
          () => this.lineItemsRepo.save(lineitem),
          te.map(() => lineitem),
        ),
      ),
    );
  }

  private getResolvedDates(
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

  private maybeGetAndValidateResourceLink(
    context: Context,
    tool: LtiTool,
    resourceLinkId: string | undefined,
  ) {
    return pipe(
      o.fromNullable(resourceLinkId),
      o.map((id) => () => this.resourceLinksRepo.findById(id)),
      o.sequence(te.ApplicativePar),
      te.chainW(
        o.fold(
          () => te.right(o.none),
          (resourceLink) => {
            const doesntBelongToTool = resourceLink.toolId !== tool.id;
            const doesntBelongToLineItemContext = resourceLink.contextId !== context.id;

            if (doesntBelongToTool) {
              return te.left(new CannotAttachResourceLinkError("doesnt_belong_to_tool"));
            }

            if (doesntBelongToLineItemContext) {
              return te.left(
                new CannotAttachResourceLinkError("doesnt_belong_to_lineitem_context"),
              );
            }

            return te.right(o.some(resourceLink));
          },
        ),
      ),
      te.mapError((error) => {
        const isNotFoundError = error instanceof LtiRepositoryError && error.type === "NotFound";
        return isNotFoundError ? new CannotAttachResourceLinkError("doesnt_belong_to_tool") : error;
      }),
      te.map(o.toUndefined),
    );
  }
}
