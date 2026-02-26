import { either as e, option as o, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { InvalidMediaTypeError } from "$/advantage/errors/invalid-media-type.error";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { ensureAcceptHeaderIsValid } from "$/advantage/utils/ensure-accept-header-is-valid";
import { ensureHasAnyScope } from "$/advantage/utils/ensure-has-any-scope";
import { Context } from "$/core/context";
import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { ToolRecord } from "$/registration/tool-record";
import { CannotAttachResourceLinkError } from "../errors/cannot-attach-resource-link.error";
import { InvalidLineItemArgumentError } from "../errors/invalid-line-item-argument.error";
import { MissingPlatformAgsConfiguration } from "../errors/missing-platform-ags-configuration.error";
import { ToolIsNotDeployedInContextError } from "../errors/tool-is-not-deployed-in-context.error";
import { LtiLineItem } from "../line-item";
import { PresentedLtiLineItem, presentLtiLineItem } from "../presenters/line-item.presenter";
import { LtiLineItemsRepository } from "../repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "../scopes";

type RawLineItemsPayload = {
  resourceId?: string;
  resourceLinkId?: string;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  label: string;
  scoreMaximum: number;
  tag?: string;
  gradesReleased?: boolean;
};

type CreateLineItemParams = {
  acceptHeader: string | undefined;
  /**
   * The LTI tool which is trying to create this line item.
   */
  tool: ToolRecord;
  context: Context;
} & RawLineItemsPayload;

type DiscoverLineItemParams = {
  resourceId: string;
  tag?: string;
};

export class LtiLineItemServices {
  public constructor(
    private readonly platform: Platform,
    private readonly resourceLinksRepo: LtiResourceLinksRepository,
    private readonly externalResourcesRepo: ExternalLtiResourcesRepository,
    private readonly lineItemsRepo: LtiLineItemsRepository,
    private readonly deploymentsRepo: LtiToolDeploymentsRepository,
  ) {}

  public async discoverLineItem({ resourceId, tag }: DiscoverLineItemParams) {
    return await this.lineItemsRepo.findByExternalResourceAndTag(resourceId, tag);
  }

  public async createLineItem({
    tool,
    context,
    resourceId,
    acceptHeader,
    ...args
  }: CreateLineItemParams): Promise<
    Either<
      | MissingScopeError
      | InvalidMediaTypeError
      | InvalidLineItemArgumentError
      | CannotAttachResourceLinkError
      | MisconfiguredPlatformError
      | LtiRepositoryError<unknown>,
      HttpResponseWrapper<LtiLineItem, PresentedLtiLineItem>
    >
  > {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfiguration());
    const { agsConfiguration } = this.platform;

    args.tag = args.tag?.trim() || undefined;

    return await pipe(
      ensureHasAnyScope({ tool, requiredScopes: AssignmentAndGradeServiceScopes.Lineitem }),
      e.chainW(() =>
        ensureAcceptHeaderIsValid({
          acceptHeader,
          requiredMediaType: LtiAdvantageMediaType.LineItem,
        }),
      ),
      te.fromEither,
      te.chainW(() => this.ensureToolIsDeployedInContext(tool, context)),
      te.chainW(() =>
        pipe(
          this.findExistingLineItemFromResourceAndTag(resourceId, args.tag),
          te.chainW((existingLineitem) => {
            if (existingLineitem) return te.right(existingLineitem);
            return this.createNewLineItem(context, tool, agsConfiguration, { resourceId, ...args });
          }),
        ),
      ),
      te.chainW((lineitem) =>
        pipe(
          async () => presentLtiLineItem(lineitem, context, this.platform),
          te.map((presentedLineItem) => ({ lineitem, presentedLineItem })),
        ),
      ),
      te.map(
        ({ lineitem, presentedLineItem }) =>
          new HttpResponseWrapper(presentedLineItem, 201, lineitem, {
            "Content-Type": LtiAdvantageMediaType.LineItem,
          }),
      ),
    )();
  }

  private findExistingLineItemFromResourceAndTag(
    resourceId: string | undefined,
    tag: RawLineItemsPayload["tag"],
  ) {
    return pipe(
      o.fromNullable(resourceId),
      o.map((resourceId) => () => this.discoverLineItem({ resourceId, tag })),
      o.sequence(te.ApplicativePar),
      te.match(
        (error) => {
          if (error.type === "ExternalError") return e.left(error);
          return e.right(undefined);
        },
        (lineitem) => e.right(o.toUndefined(lineitem)),
      ),
    );
  }

  private createNewLineItem(
    context: Context,
    tool: ToolRecord,
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

  private ensureToolIsDeployedInContext(tool: ToolRecord, context: Context) {
    return pipe(
      () => this.deploymentsRepo.findDeploymentInContextOrGlobal(tool.id, context.id),
      te.map((_) => {}),
      te.mapLeft((err) => {
        if (err.type === "NotFound") return new ToolIsNotDeployedInContextError(tool, context);
        return err;
      }),
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
    tool: ToolRecord,
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
