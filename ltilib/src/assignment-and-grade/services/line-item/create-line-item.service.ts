import { either as e, option as o, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { CannotAttachResourceLinkError } from "$/assignment-and-grade/errors/cannot-attach-resource-link.error";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiTool } from "$/core/tool";
import { MissingPlatformAgsConfigurationError } from "../../errors/missing-platform-ags-configuration.error";
import { ILtiLineItem, LtiLineItem } from "../../line-item";
import { PresentedLtiLineItem, presentLtiLineItem } from "../../presenters/line-item.presenter";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "../../scopes";
import { LineItemService } from "./base-service";

type RawLineItemsPayload = {
  resourceId?: string;
  resourceLinkId?: string;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  label: string;
  scoreMaximum: number;
  tag?: string;
  gradesReleased?: boolean;
} & Pick<ILtiLineItem, "customParameters">; // this inherits the docstrings, which is valuable!!

export type CreateLineItemServiceParams<CustomContextType extends string = never> = {
  /**
   * The LTI tool which is trying to create this line item.
   */
  tool: LtiTool;
  context: Context<CustomContextType>;
} & RawLineItemsPayload;

const REQUIRED_SCOPES = [AssignmentAndGradeServiceScopes.Lineitem] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.create `LtiLineItemServices.create`} instead.
 *
 * @internal
 */
export class CreateService<CustomContextType extends string = never> extends LineItemService {
  public constructor(
    private readonly platform: Platform,
    private readonly resourceLinksRepo: LtiResourceLinksRepository,
    private readonly externalResourcesRepo: ExternalLtiResourcesRepository,
    private readonly lineItemsRepo: LtiLineItemsRepository,
  ) {
    super();
  }

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }
  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.LineItem;
  }

  public async execute({ tool, context, ...args }: CreateLineItemServiceParams<CustomContextType>) {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
    const { agsConfiguration } = this.platform;

    args.resourceLinkId = args.resourceLinkId?.trim() || undefined;

    return await pipe(
      te.Do,
      te.bindW("existingLineItem", () =>
        this.findExistingLineItem(args.resourceLinkId, args.resourceId, args.tag, context, tool),
      ),
      te.bindW("lineItem", ({ existingLineItem }) => {
        if (existingLineItem) return te.right(existingLineItem);
        return this.createNewLineItem(context, tool, agsConfiguration, args);
      }),
      te.bindW("presentedLineItem", ({ lineItem }) => this.presentLineItem(lineItem, context)),
      te.map(
        ({ lineItem, presentedLineItem }) =>
          new HttpResponseWrapper<LtiLineItem<unknown>, PresentedLtiLineItem>(
            presentedLineItem,
            201,
            lineItem,
            { "Content-Type": LtiAdvantageMediaType.LineItem },
          ),
      ),
    )();
  }

  private presentLineItem(
    lineItem: LtiLineItem<CustomContextType>,
    context: Context<CustomContextType>,
  ) {
    return pipe(presentLtiLineItem(lineItem, context, this.platform), te.fromEither);
  }

  private findExistingLineItem(
    resourceLinkId: string | undefined,
    resourceId: string | undefined,
    tag: RawLineItemsPayload["tag"],
    context: Context<unknown>,
    tool: LtiTool,
  ) {
    return pipe(
      () => this.lineItemsRepo.findExisting(tool, context, resourceLinkId, resourceId, tag),
      te.orElseW((error) => (error.type === "NotFound" ? te.right(undefined) : te.left(error))),
      te.map((lineitem) => lineitem as LtiLineItem<CustomContextType> | undefined),
    );
  }

  private createNewLineItem(
    context: Context<CustomContextType>,
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
          o.map((id) => () => this.externalResourcesRepo.findOrCreateByExternalId(id, tool.id)),
          o.sequence(te.ApplicativeSeq),
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
            context,
          }),
        );
      }),
      te.chainW((lineitem) =>
        pipe(
          () => this.lineItemsRepo.create(lineitem, tool),
          te.map(() => lineitem),
        ),
      ),
    );
  }

  private maybeGetAndValidateResourceLink(
    context: Context<CustomContextType>,
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
              return te.left(new CannotAttachResourceLinkError("must_belong_to_tool"));
            }

            if (doesntBelongToLineItemContext) {
              return te.left(new CannotAttachResourceLinkError("must_belong_to_lineitem_context"));
            }

            return te.right(o.some(resourceLink));
          },
        ),
      ),
      te.mapError((error) => {
        const isNotFoundError = error instanceof LtiRepositoryError && error.type === "NotFound";
        return isNotFoundError ? new CannotAttachResourceLinkError("must_belong_to_tool") : error;
      }),
      te.map(o.toUndefined),
    );
  }
}
