import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "../errors/repository.error";
import { UserIdentity } from "../user-identity";

export abstract class LtiUserIdentitiesRespository<CustomRoles = never> {
  public abstract findUserIdentityById(
    userId: UserIdentity<CustomRoles>["id"],
  ): Promise<Either<LtiRepositoryError, UserIdentity<CustomRoles>>>;
}
