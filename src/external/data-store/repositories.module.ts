import { Global, Module } from "@nestjs/common";
import { PeopleRepository } from "@/modules/identity/person/people.repository";
import { UsersRepository } from "@/modules/identity/user/users.repository";
import { LtiResourceLinksRepository } from "@/modules/lti/resource-links/resource-links.repository";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository";
import { OIDCAccountsRepository } from "@/modules/oidc/repositories/accounts.repository";
import { OIDCClientsRepository } from "@/modules/oidc/repositories/clients.repository";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository as BaseLtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository";
import { DrizzleLtiToolsRepository } from "./drizzle/repositories/lti-tools.repository";
import { DrizzleLtiToolsDeploymentsRepository } from "./drizzle/repositories/lti-tools-deployments.repository";
import { DrizzleODICAccountsRepository } from "./drizzle/repositories/oidc-accounts.repository";
import { DrizzleOIDCClientsRepository } from "./drizzle/repositories/oidc-clients.repository";
import { DrizzlePeopleRepository } from "./drizzle/repositories/people.repository";
import { DrizzleLtiResourceLinksRepository } from "./drizzle/repositories/resource-links.repository";
import { DrizzleUsersRepository } from "./drizzle/repositories/users.repository";
import { RedisLtiLaunchesRepository } from "./redis/repositories/lti-launches.repository";

@Global()
@Module({
  providers: [
    DrizzleLtiResourceLinksRepository,
    DrizzlePeopleRepository,
    { provide: UsersRepository, useClass: DrizzleUsersRepository },
    { provide: OIDCClientsRepository, useClass: DrizzleOIDCClientsRepository },
    { provide: OIDCAccountsRepository, useClass: DrizzleODICAccountsRepository },
    { provide: LtiToolsRepository, useClass: DrizzleLtiToolsRepository },
    { provide: LtiResourceLinksRepository, useExisting: DrizzleLtiResourceLinksRepository },
    { provide: BaseLtiResourceLinksRepository, useExisting: DrizzleLtiResourceLinksRepository },
    { provide: LtiToolsDeploymentsRepository, useClass: DrizzleLtiToolsDeploymentsRepository },
    { provide: LtiLaunchesRepository, useClass: RedisLtiLaunchesRepository },
    { provide: PeopleRepository, useExisting: DrizzlePeopleRepository },
    { provide: LtiUserIdentitiesRespository, useExisting: DrizzlePeopleRepository },
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
    LtiLaunchesRepository,
    LtiUserIdentitiesRespository,
  ],
})
export class RepositoriesModule {}
