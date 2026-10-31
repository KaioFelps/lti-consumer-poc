import { Either } from "fp-ts/lib/Either.js";
import { LtiRepositoryError } from "../errors/repository.error.js";
import { UserIdentity } from "../user-identity.js";

export abstract class LtiUserIdentitiesRespository<CustomRoles = never> {
  public abstract findUserIdentityById(
    userId: UserIdentity<CustomRoles>["id"],
  ): Promise<Either<LtiRepositoryError, UserIdentity<CustomRoles>>>;
}
