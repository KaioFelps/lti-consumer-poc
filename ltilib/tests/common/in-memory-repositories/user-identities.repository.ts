import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository";
import { UserIdentity } from "$/core/user-identity";

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
