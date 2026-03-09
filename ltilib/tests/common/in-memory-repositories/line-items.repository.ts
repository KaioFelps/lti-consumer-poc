import { either as e, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiResourceLink } from "$/core/resource-link";

export class InMemoryLtiLineItemsRepository implements LtiLineItemsRepository {
  public lineItems: LtiLineItem[] = [];

  public async save(lineItem: LtiLineItem): Promise<Either<LtiRepositoryError, void>> {
    this.lineItems.push(lineItem);
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
      o.match(
        () =>
          e.left(
            new LtiRepositoryError({
              type: "NotFound",
              cause: undefined,
              subject: LtiLineItem.name,
            }),
          ),
        (lineitem) => e.right(lineitem),
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
}
