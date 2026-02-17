import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLineItem } from "../line-item";

export abstract class LtiLineItemsRepository {
  public abstract save(lineItem: LtiLineItem): Promise<Either<LtiRepositoryError, void>>;

  public abstract findByExternalResourceAndTag(
    resourceId: string,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;
}
