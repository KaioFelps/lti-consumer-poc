import { either as e, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";

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
}
