import { Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema";
import { sql } from "drizzle-orm";
import { either, option, taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { User } from "@/identity/user/user.entity";
import { UsersRepository } from "@/identity/user/users.repository";
import { DrizzleClient } from "../client";

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
  public constructor(private drizzle: DrizzleClient) {
    super();
  }

  async findUserByUsername(
    username: string,
  ): Promise<Either<ResourceNotFoundError | IrrecoverableError, User>> {
    const fetchedUser = await pipe(
      tryCatch(
        () =>
          this.drizzle
            .getClient()
            .select()
            .from(usersTable)
            .where(sql`username = ${username}`)
            .limit(1)
            .execute(),
        (error: Error) =>
          new IrrecoverableError(
            "An error occurred in DrizzleUsersRepository when " +
              "finding a user by its username.",
            error,
          ),
      ),
      taskEither.map((userAsArray) => {
        if (userAsArray.length === 0) return option.none;
        return option.some(userAsArray[0]);
      }),
    )();

    if (either.isLeft(fetchedUser)) return fetchedUser;
    const optionalUser = fetchedUser.right;

    if (option.isNone(optionalUser)) {
      const error = new ResourceNotFoundError({
        errorMessageIdentifier:
          UsersRepository.messages.findUserByUsername.resourceNotFound,
        messageParams: { username },
      });
      return either.left(error);
    }

    const user = User.createUnchecked(optionalUser.value);
    return either.right(user);
  }
}
