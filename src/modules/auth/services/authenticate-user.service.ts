import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { User } from "@/modules/identity/user/user.entity";
import { UsersRepository } from "@/modules/identity/user/users.repository";
import { PasswordComparator } from "../password/comparator";

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
