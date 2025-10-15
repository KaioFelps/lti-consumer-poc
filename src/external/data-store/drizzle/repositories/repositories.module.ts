import { Global, Module } from "@nestjs/common";
import { UsersRepository } from "@/identity/user/users.repository";
import { DrizzleUsersRepository } from "./users.repository";

@Global()
@Module({
  providers: [
    {
      provide: UsersRepository,
      useClass: DrizzleUsersRepository,
    },
  ],
  exports: [UsersRepository],
})
export class RepositoriesModule {}
