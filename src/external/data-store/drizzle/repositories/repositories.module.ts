import { Global, Module } from "@nestjs/common";
import { PeopleRepository } from "@/identity/person/people.repository";
import { UsersRepository } from "@/identity/user/users.repository";
import { DrizzlePeopleRepository } from "./people.repository";
import { DrizzleUsersRepository } from "./users.repository";

@Global()
@Module({
  providers: [
    {
      provide: UsersRepository,
      useClass: DrizzleUsersRepository,
    },
    {
      provide: PeopleRepository,
      useClass: DrizzlePeopleRepository,
    },
  ],
  exports: [UsersRepository, PeopleRepository],
})
export class RepositoriesModule {}
