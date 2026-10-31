import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository.js";
import { UserIdentity } from "$/core/user-identity.js";

export class InMemoryUserIdentitiesRepository<CR = never>
  implements LtiUserIdentitiesRespository<CR>
{
  public users: UserIdentity<CR>[] = [];

  public async findUserIdentityById(
    userId: UserIdentity<CR>["id"],
  ): Promise<Either<LtiRepositoryError, UserIdentity<CR>>> {
    const user = this.users.find((user) => user.id === userId);

    if (user) return e.right(user);

    return e.left(
      new LtiRepositoryError({ type: "NotFound", subject: UserIdentity.name, cause: undefined }),
    );
  }
}
