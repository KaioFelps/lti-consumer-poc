import { Global, Module } from "@nestjs/common";
import { PeopleRepository } from "@/identity/person/people.repository";
import { UsersRepository } from "@/identity/user/users.repository";
import { OIDCAccountsRepository } from "@/oidc/repositories/accounts.repository";
import { OIDCClientsRepository } from "@/oidc/repositories/clients.repository";
import { DrizzleODICAccountsRepository } from "./oidc-accounts.repository";
import { DrizzleOIDCClientsRepository } from "./oidc-clients.repository";
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
    {
      provide: OIDCClientsRepository,
      useClass: DrizzleOIDCClientsRepository,
    },
    {
      provide: OIDCAccountsRepository,
      useClass: DrizzleODICAccountsRepository,
    },
  ],
  exports: [
    UsersRepository,
    PeopleRepository,
    OIDCClientsRepository,
    OIDCAccountsRepository,
  ],
})
export class RepositoriesModule {}
