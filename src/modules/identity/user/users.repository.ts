import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";
import { User } from "./user.entity.js";

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
