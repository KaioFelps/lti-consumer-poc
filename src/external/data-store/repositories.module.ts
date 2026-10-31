import { forwardRef, Global, Module } from "@nestjs/common";
import { AssignmentsRepository } from "@/modules/assignments-and-grades/repositories/assignments.repository.js";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository.js";
import { InstructorsRepository } from "@/modules/courses-and-enrollments/repositories/instructors.repository.js";
import { StudentsRepository } from "@/modules/courses-and-enrollments/repositories/students.repository.js";
import { PeopleRepository } from "@/modules/identity/person/people.repository.js";
import { UsersRepository } from "@/modules/identity/user/users.repository.js";
import { ContextFetchersModule } from "@/modules/lti/advantage/context/fetchers/context-fetchers.module.js";
import { LtiContextsRepository } from "@/modules/lti/advantage/repositories/lti-contexts.repository.js";
import { ExternalLtiAssignmentsRepository } from "@/modules/lti/ags/repositories/external-lti-assignments.repository.js";
import { LtiLineItemsRepository } from "@/modules/lti/ags/repositories/lti-line-items.repository.js";
import { LtiScoresRepository } from "@/modules/lti/ags/repositories/lti-scores.repository.js";
import { LtiResourceLinksRepository } from "@/modules/lti/resource-links/resource-links.repository.js";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository.js";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository.js";
import { OIDCAccountsRepository } from "@/modules/oidc/repositories/accounts.repository.js";
import { OIDCClientsRepository } from "@/modules/oidc/repositories/clients.repository.js";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository.js";
import { LtiLineItemsRepository as BaseLtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { LtiScoresRepository as BaseLtiScoresRepository } from "$/assignment-and-grade/repositories.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";
import { LtiResourceLinksRepository as BaseLtiResourceLinksRepository } from "$/core/repositories/resource-links.repository.js";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository.js";
import { DrizzleAssignmentsRepository } from "./drizzle/repositories/assignments.repository.js";
import { DrizzleCoursesRepository } from "./drizzle/repositories/courses.repository.js";
import { DrizzleExternalLtiAssignmentsRepository } from "./drizzle/repositories/external-lti-assignments.repository.js";
import { DrizzleExternalLtiResourcesRepository } from "./drizzle/repositories/external-lti-resources.repository.js";
import { DrizzleInstructorsRepository } from "./drizzle/repositories/instructors.repository.js";
import { DrizzleLtiContextsRepository } from "./drizzle/repositories/lti-contexts.repository.js";
import { DrizzleLtiLineItemsRepository } from "./drizzle/repositories/lti-line-items.repository.js";
import { DrizzleLtiScoresRepository } from "./drizzle/repositories/lti-scores.repository.js";
import { DrizzleLtiToolsRepository } from "./drizzle/repositories/lti-tools.repository.js";
import { DrizzleLtiToolsDeploymentsRepository } from "./drizzle/repositories/lti-tools-deployments.repository.js";
import { DrizzleODICAccountsRepository } from "./drizzle/repositories/oidc-accounts.repository.js";
import { DrizzleOIDCClientsRepository } from "./drizzle/repositories/oidc-clients.repository.js";
import { DrizzlePeopleRepository } from "./drizzle/repositories/people.repository.js";
import { DrizzleLtiResourceLinksRepository } from "./drizzle/repositories/resource-links.repository.js";
import { DrizzleStudentsRepository } from "./drizzle/repositories/students.repository.js";
import { DrizzleUsersRepository } from "./drizzle/repositories/users.repository.js";
import { RedisLtiLaunchesRepository } from "./redis/repositories/lti-launches.repository.js";

@Global()
@Module({
  imports: [forwardRef(() => ContextFetchersModule)],
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
    { provide: CoursesRepository, useClass: DrizzleCoursesRepository },
    { provide: AssignmentsRepository, useClass: DrizzleAssignmentsRepository },
    { provide: InstructorsRepository, useClass: DrizzleInstructorsRepository },
    {
      provide: ExternalLtiAssignmentsRepository,
      useClass: DrizzleExternalLtiAssignmentsRepository,
    },
    DrizzleLtiLineItemsRepository,
    { provide: BaseLtiLineItemsRepository, useClass: DrizzleLtiLineItemsRepository },
    { provide: LtiLineItemsRepository, useClass: DrizzleLtiLineItemsRepository },
    { provide: ExternalLtiResourcesRepository, useClass: DrizzleExternalLtiResourcesRepository },
    { provide: LtiContextsRepository, useClass: DrizzleLtiContextsRepository },
    DrizzleLtiScoresRepository,
    { provide: BaseLtiScoresRepository, useExisting: DrizzleLtiScoresRepository },
    { provide: LtiScoresRepository, useExisting: DrizzleLtiScoresRepository },
    { provide: StudentsRepository, useClass: DrizzleStudentsRepository },
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
    CoursesRepository,
    AssignmentsRepository,
    InstructorsRepository,
    ExternalLtiAssignmentsRepository,
    BaseLtiLineItemsRepository,
    LtiLineItemsRepository,
    ExternalLtiResourcesRepository,
    LtiContextsRepository,
    BaseLtiScoresRepository,
    LtiScoresRepository,
    StudentsRepository,
  ],
})
export class RepositoriesModule {}
