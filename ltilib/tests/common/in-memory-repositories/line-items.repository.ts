import { either as e, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";

export class InMemoryLtiLineItemsRepository implements LtiLineItemsRepository {
  public lineItems: LtiLineItem[] = [];

  public async save(lineItem: LtiLineItem): Promise<Either<LtiRepositoryError, void>> {
    const index = this.lineItems.findIndex((li) => li.id === lineItem.id);

    if (index !== -1) this.lineItems[index] = lineItem;
    else this.lineItems.push(lineItem);

    return e.right(undefined);
  }
  public async findByExternalResourceAndTag(
    resourceId: string,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    return pipe(
      this.lineItems.find(
        (lineItem) =>
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
    );
  }

  public async findManyByResourceLink(
    resourceLinkId: LtiResourceLink["id"],
    limit: number,
  ): Promise<Either<LtiRepositoryError, LtiLineItem[]>> {
    const lineitems = this.lineItems
      .filter((lineitem) => lineitem.resourceLink?.id === resourceLinkId)
      .slice(0, limit);

    return e.right(lineitems);
  }

  public async findById(
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    const lineItem = this.lineItems.find((lineItem) => lineItem.id === lineItemId);

    if (lineItem) return e.right(lineItem);

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
    const filters = (lineItem: LtiLineItem) => {
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
    const lineItemsSlice = filteredLineItems.slice(offset, offset + limit);

    return e.right({ count, values: lineItemsSlice });
  }
}
