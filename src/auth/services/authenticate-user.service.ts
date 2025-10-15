import { Injectable } from "@nestjs/common";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { User } from "@/identity/user/user.entity";
import { UsersRepository } from "@/identity/user/users.repository";
import { PasswordComparator } from "../password/comparator";

type AuthenticateUserParams = {
  username: string;
  password: string;
};

type PossibleErrors =
  | IrrecoverableError
  | ResourceNotFoundError
  | UnauthorizedError;

@Injectable()
export class AuthenticateUserService {
  public constructor(
    private passwordComparator: PasswordComparator,
    private usersRepository: UsersRepository,
  ) {}

  public async execute({
    username,
    password,
  }: AuthenticateUserParams): Promise<Either<PossibleErrors, User>> {
    const userFromDatastore =
      await this.usersRepository.findUserByUsername(username);

    if (either.isLeft(userFromDatastore)) return userFromDatastore;
    const user = userFromDatastore.right;

    const passwordsMatch = await this.passwordComparator.compare(
      password,
      user.getPasswordHash(),
    );

    if (!passwordsMatch)
      return either.left(
        new UnauthorizedError({
          errorMessageIdentifier: "auth:authenticate-user:invalid-credentials",
        }),
      );

    return either.right(user);
  }
}
