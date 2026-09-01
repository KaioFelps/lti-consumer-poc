import { generateUUID } from "common/src/types/uuid";
import { either as e, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";

type Record = {
  lineItem: LtiLineItem;
  owningTool: LtiTool;
};

export class InMemoryLtiLineItemsRepository implements LtiLineItemsRepository {
  public lineItems: Record[] = [];

  public async create(
    lineItem: LtiLineItem,
    owningTool: LtiTool,
  ): Promise<Either<LtiRepositoryError, void>> {
    const index = this.lineItems.findIndex((record) => record.lineItem.id === lineItem.id);

    if (index !== -1) this.lineItems[index] = { lineItem, owningTool };
    else this.lineItems.push({ lineItem, owningTool });

    return e.right(undefined);
  }
  public async findExisting(
    _tool: LtiTool,
    _context: Context<unknown>,
    _resourceLinkId: string | undefined,
    resourceId: string | undefined,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    return pipe(
      this.lineItems.find(
        ({ lineItem }) =>
          lineItem.externalResource?.externalToolResourceId === resourceId && lineItem.tag === tag,
      ),
      o.fromNullable,
      e.fromOption(
        () =>
          new LtiRepositoryError({
            type: "NotFound",
            subject: LtiLineItem.name,
            cause: undefined,
          }),
      ),
      e.map((rec) => rec.lineItem),
    );
  }

  public async findManyByResourceLink(
    resourceLinkId: LtiResourceLink["id"],
    _context: Context,
    limit: number,
  ): Promise<Either<LtiRepositoryError, LtiLineItem[]>> {
    const lineitems = this.lineItems
      .filter(({ lineItem }) => lineItem.resourceLink?.id === resourceLinkId)
      .slice(0, limit)
      .map((r) => r.lineItem);

    return e.right(lineitems);
  }

  public async findById(
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    const record = this.lineItems.find(({ lineItem }) => lineItem.id === lineItemId);

    if (record) return e.right(record.lineItem);

    return e.left(
      new LtiRepositoryError({ type: "NotFound", subject: LtiLineItem.name, cause: undefined }),
    );
  }

  public async fetchWithContainerFilters(
    context: Context,
    tool: LtiTool,
    limit: number,
    page: number,
    { tag, resourceId, resourceLinkId }: Omit<LineItemsContainerFilters, "limit" | "page">,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiLineItem>>> {
    const filters = ({ lineItem }: Record) => {
      const matchesResourceLinkId = !resourceLinkId || lineItem.resourceLink?.id === resourceLinkId;
      const matchesTag = !tag || lineItem.tag === tag;
      const matchesResourceId =
        !resourceId || lineItem.externalResource?.externalToolResourceId === resourceId;

      return (
        matchesResourceId &&
        matchesResourceLinkId &&
        matchesTag &&
        lineItem.isAccessibleToTool(tool) &&
        lineItem.belongsToContext(context)
      );
    };

    const filteredLineItems = this.lineItems.filter(filters);
    const count = filteredLineItems.length;

    const offset = (page - 1) * limit;
    const lineItemsSlice = filteredLineItems
      .slice(offset, offset + limit)
      .map((rec) => rec.lineItem);

    return e.right({ count, values: lineItemsSlice });
  }

  public async update(
    lineItem: LtiLineItem.UpdateRecord,
    tool: LtiTool,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    const rec = this.lineItems.find(({ lineItem: item }) => item.id === lineItem.id);

    if (!rec || rec.owningTool.id !== tool.id) {
      return e.left(
        new LtiRepositoryError({
          type: "NotFound",
          subject: LtiLineItem.name,
          cause: undefined,
        }),
      );
    }

    const existingLineItem = rec.lineItem;
    let resolvedExternalResource: ExternalLtiResource | undefined;

    if (
      lineItem.externalResource?.externalToolResourceId ===
      existingLineItem.externalResource?.externalToolResourceId
    ) {
      resolvedExternalResource = existingLineItem.externalResource;
    } else if (lineItem.externalResource?.externalToolResourceId) {
      resolvedExternalResource = ExternalLtiResource.create({
        externalToolResourceId: lineItem.externalResource.externalToolResourceId,
        tool,
        localResourceId: generateUUID(),
      });
    }

    const newLineItem = LtiLineItem.createUnchecked({
      id: existingLineItem.id,
      context: existingLineItem.context,
      label: lineItem.label,
      scoreMaximum: lineItem.scoreMaximum,
      customParameters: lineItem.customParameters,
      endDateTime: lineItem.endDateTime ?? undefined,
      startDateTime: lineItem.startDateTime ?? undefined,
      externalResource: resolvedExternalResource,
      gradesReleased: lineItem.gradesReleased,
      resourceLink: existingLineItem.resourceLink,
      tag: lineItem.tag,
    });

    this.lineItems = [
      ...this.lineItems.filter(({ lineItem }) => lineItem.id !== newLineItem.id),
      { lineItem: newLineItem, owningTool: tool },
    ];

    return e.right(newLineItem);
  }
}
