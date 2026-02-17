import { either as e, option as o, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { Context } from "$/core/context";
import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { ToolRecord } from "$/registration/tool-record";
import { CannotAttachResourceLinkError } from "../errors/cannot-attach-resource-link.error";
import { InvalidLineItemArgumentError } from "../errors/invalid-line-item-argument.error";
import { MissingPlatformAgsConfiguration } from "../errors/missing-platform-ags-configuration.error";
import { LtiLineItem } from "../line-item";
import { LtiLineItemsRepository } from "../repositories/line-items.repository";

type CreateLineItemParams = {
  /**
   * The LTI tool which is trying to create this line item.
   */
  tool: ToolRecord;
  resourceId?: string;
  resourceLinkId?: string;
  context: Context;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  label: string;
  scoreMaximum: number;
  tag?: string;
  gradesReleased?: boolean;
};

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
  ) {}

  public async discoverLineItem({ resourceId, tag }: DiscoverLineItemParams) {
    return await this.lineItemsRepo.findByExternalResourceAndTag(resourceId, tag);
  }

  public async createLineItem({
    tool,
    resourceId,
    resourceLinkId,
    context,
    tag,
    ...args
  }: CreateLineItemParams): Promise<
    Either<
      | InvalidLineItemArgumentError
      | CannotAttachResourceLinkError
      | MisconfiguredPlatformError
      | LtiRepositoryError<unknown>,
      LtiLineItem
    >
  > {
    if (!this.platform.agsConfiguration) {
      return e.left(new MissingPlatformAgsConfiguration());
    }

    const { agsConfiguration } = this.platform;

    tag = tag?.trim() || undefined;

    const existingLineitem = pipe(
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

    return await pipe(
      existingLineitem,
      te.chainW((existingLineitem) => {
        if (existingLineitem) return te.right(existingLineitem);

        return pipe(
          te.Do,
          te.apS(
            "externalResource",
            pipe(
              o.fromNullable(resourceId),
              o.map((id) => () => this.externalResourcesRepo.findById(id)),
              o.sequence(te.ApplicativePar),
              te.map(o.toUndefined),
            ),
          ),
          te.apS(
            "resourceLinkItem",
            this.maybeGetAndValidateResourceLink(context, tool, resourceLinkId),
          ),
          te.chainW(({ externalResource, resourceLinkItem }) => {
            const { resolvedEndDate, resolvedStartDate } = this.getResolvedDates(
              agsConfiguration,
              args.startDateTime,
              args.endDateTime,
            );

            return te.fromEither(
              LtiLineItem.create({
                ...args,
                tag,
                resource: externalResource,
                resourceLink: resourceLinkItem,
                startDateTime: resolvedStartDate,
                endDateTime: resolvedEndDate,
              }),
            );
          }),
          te.chain((lineitem) =>
            pipe(
              () => this.lineItemsRepo.save(lineitem),
              te.map(() => lineitem),
            ),
          ),
        );
      }),
    )();
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
      te.map(o.toUndefined),
    );
  }
}
