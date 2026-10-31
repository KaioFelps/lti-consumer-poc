import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";
import { UnauthorizedError } from "@/core/errors/unauthorized.error.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { UsersRepository } from "@/modules/identity/user/users.repository.js";
import { PasswordComparator } from "../password/comparator.js";

type AuthenticateUserParams = {
  username: string;
  password: string;
};

@Injectable()
export class AuthenticateUserService {
  public constructor(
    private passwordComparator: PasswordComparator,
    private usersRepository: UsersRepository,
  ) {}

  public async execute({ username, password }: AuthenticateUserParams) {
    const errorMessageIdentifier = "auth:authenticate-user:invalid-credentials";
    return await pipe(
      te.Do,
      te.bindW("user", () => () => this.usersRepository.findUserByUsername(username)),
      te.bindW("passwordsMatch", ({ user }) => this.checkPasswords(password, user)),
      te.chainW(({ passwordsMatch, user }) => {
        if (passwordsMatch) return te.right(user);
        return te.left(new UnauthorizedError({ errorMessageIdentifier }));
      }),
      te.mapLeft((error) => {
        if (!(error instanceof ResourceNotFoundError)) return error;
        return new UnauthorizedError({ errorMessageIdentifier });
      }),
    )();
  }

  private checkPasswords(password: string, user: User) {
    return pipe(
      () => this.passwordComparator.compare(password, user.getPasswordHash()),
      te.fromTask,
    );
  }
}
