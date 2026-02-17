import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { User } from "./user.entity";

export abstract class UsersRepository {
  /**
   * Message strings identifiers for possible errors originated from methods within
   * this repository. Implementations inherit these messages and therefore does not
   * need to write hard-coded strings identifiers, avoiding spelling errors or
   * inconsistency.
   */
  protected static messages = {
    findUserByUsername: {
      resourceNotFound: "identity:users-repository:find-user-by-username:resource-not-found",
    },
  } as const;

  abstract findUserByUsername(
    username: string,
  ): Promise<Either<ResourceNotFoundError | IrrecoverableError, User>>;
}
