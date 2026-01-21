import { Global, Module } from "@nestjs/common";
import { PeopleRepository } from "@/identity/person/people.repository";
import { UsersRepository } from "@/identity/user/users.repository";
import { LtiResourceLinksRepository } from "@/lti/resource-links/resource-links.repository";
import { LtiToolsRepository } from "@/lti/tools/lti-tools.repository";
import { LtiToolsDeploymentsRepository } from "@/lti/tools/lti-tools-deployments.repository";
import { OIDCAccountsRepository } from "@/oidc/repositories/accounts.repository";
import { OIDCClientsRepository } from "@/oidc/repositories/clients.repository";
import { LtiResourceLinksRepository as BaseLtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { DrizzleLtiToolsRepository } from "./lti-tools.repository";
import { DrizzleLtiToolsDeploymentsRepository } from "./lti-tools-deployments.repository";
import { DrizzleODICAccountsRepository } from "./oidc-accounts.repository";
import { DrizzleOIDCClientsRepository } from "./oidc-clients.repository";
import { DrizzlePeopleRepository } from "./people.repository";
import { DrizzleLtiResourceLinksRepository } from "./resource-links.repository";
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
    {
      provide: LtiToolsRepository,
      useClass: DrizzleLtiToolsRepository,
    },
    {
      provide: DrizzleLtiResourceLinksRepository,
      useClass: DrizzleLtiResourceLinksRepository,
    },
    {
      provide: LtiResourceLinksRepository,
      useExisting: DrizzleLtiResourceLinksRepository,
    },
    {
      provide: BaseLtiResourceLinksRepository,
      useExisting: DrizzleLtiResourceLinksRepository,
    },
    {
      provide: LtiToolsDeploymentsRepository,
      useClass: DrizzleLtiToolsDeploymentsRepository,
    },
  ],
  exports: [
    UsersRepository,
    PeopleRepository,
    OIDCClientsRepository,
    OIDCAccountsRepository,
    LtiToolsRepository,
    LtiResourceLinksRepository,
    LtiToolsDeploymentsRepository,
    BaseLtiResourceLinksRepository,
  ],
})
export class RepositoriesModule {}
