import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { AuthModule } from "@/modules/auth/auth.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { OIDCModule } from "@/modules/oidc/oidc.module";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository";
import { LtiLaunchServices } from "$/core/services/launch";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services";
import { AssignmentsAndGradesModule } from "../assignments-and-grades/assignments-and-grades.module";
import { CoursesModule } from "../courses-and-enrollments/courses.module";
import { ContextFetchersModule } from "./advantage/context/fetchers/context-fetchers.module";
import { FindContextByIdService } from "./advantage/context/services/find-context-by-id.service";
import { LtiAssignmentsController } from "./ags/controllers/lti-assignments.controller";
import { LtiLineItemsController } from "./ags/controllers/lti-line-items.controller";
import { CreateExternalLtiAssignmentService } from "./ags/services/create-external-lti-assignment.service";
import { FindExternalLtiAssignmentByIdService } from "./ags/services/find-external-lti-assignment-by-id.service";
import { LtiDeploymentsController } from "./deployments/deployments.controller";
import { DeployToolService } from "./deployments/services/deploy-tool.service";
import { FindDeploymentByIdService } from "./deployments/services/find-deployment-by-id.service";
import { RemoveToolDeploymentService } from "./deployments/services/remove-tool-deployment.service";
import { LtiLaunchesController } from "./launches/launches.controller";
import { InitiateLaunchService } from "./launches/services/initiate-launch.service";
import { LtiController } from "./lti.controller";
import { PlatformFactory } from "./platform.factory";
import { LtiResourceLinksController } from "./resource-links/resource-links.controller";
import { CreateResourceLinkService } from "./resource-links/services/create-resource-link.service";
import { DeleteResourceLinkService } from "./resource-links/services/delete-resource-link.service";
import { findResourceLinkByIdService } from "./resource-links/services/find-resource-link-by-id.service";
import { LtiToolsRepository } from "./tools/lti-tools.repository";
import { LtiToolsDeploymentsRepository } from "./tools/lti-tools-deployments.repository";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";
import { FindToolByIdService } from "./tools/services/find-tool-by-id.service";
import { GetToolRegistrationDetailsService } from "./tools/services/get-tool-registration-details.service";
import { LtiToolsController } from "./tools/tools.controller";

@Module({
  imports: [
    OIDCModule,
    AuthModule,
    IdentityModule,
    AssignmentsAndGradesModule,
    forwardRef(() => CoursesModule),
    ContextFetchersModule,
  ],
  providers: [
    PlatformFactory,
    {
      provide: Platform,
      useFactory: (factory: PlatformFactory) => factory.create(),
      inject: [PlatformFactory],
    },
    {
      provide: LtiAgsClaimServices,
      inject: [Platform, LtiLineItemsRepository],
      useFactory: (platform: Platform, lineItemsRepo: LtiLineItemsRepository) =>
        new LtiAgsClaimServices(platform, lineItemsRepo),
    },
    {
      provide: LtiLaunchServices,
      useFactory: (
        ltiResourceLinksRepository: LtiResourceLinksRepository,
        ltiToolsRepository: LtiToolsRepository,
        launchRepository: LtiLaunchesRepository,
        platform: Platform,
        userIdentitiesRepository: LtiUserIdentitiesRespository,
        agsClaimServices: LtiAgsClaimServices,
      ) =>
        new LtiLaunchServices(
          ltiResourceLinksRepository,
          ltiToolsRepository,
          launchRepository,
          userIdentitiesRepository,
          platform,
          agsClaimServices,
        ),
      inject: [
        LtiResourceLinksRepository,
        LtiToolsRepository,
        LtiLaunchesRepository,
        Platform,
        LtiUserIdentitiesRespository,
        LtiAgsClaimServices,
      ],
    },
    {
      provide: LtiResourceLinkServices,
      inject: [LtiResourceLinksRepository],
      useFactory: (resourceLinksRepository: LtiResourceLinksRepository) =>
        new LtiResourceLinkServices(resourceLinksRepository),
    },
    FindManyToolsPreviewsService,
    FindToolByIdService,
    DeployToolService,
    GetToolRegistrationDetailsService,
    RemoveToolDeploymentService,
    FindDeploymentByIdService,
    CreateResourceLinkService,
    DeleteResourceLinkService,
    findResourceLinkByIdService,
    InitiateLaunchService,
    CreateExternalLtiAssignmentService,
    FindExternalLtiAssignmentByIdService,
    FindContextByIdService,
    {
      provide: LtiLineItemServices,
      useFactory: (
        platform: Platform,
        resourceLinksRepo: LtiResourceLinksRepository,
        externalResourcesRepo: ExternalLtiResourcesRepository,
        lineItemsRepo: LtiLineItemsRepository,
        deploymentsRepo: LtiToolsDeploymentsRepository,
      ) =>
        new LtiLineItemServices(
          platform,
          resourceLinksRepo,
          externalResourcesRepo,
          lineItemsRepo,
          deploymentsRepo,
        ),
      inject: [
        Platform,
        LtiResourceLinksRepository,
        ExternalLtiResourcesRepository,
        LtiLineItemsRepository,
        LtiToolsDeploymentsRepository,
      ],
    },
  ],
  exports: [LtiLaunchServices, Platform],
  controllers: [
    LtiController,
    LtiToolsController,
    LtiDeploymentsController,
    LtiResourceLinksController,
    LtiLaunchesController,
    LtiAssignmentsController,
    LtiLineItemsController,
  ],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(...middlewares.mvc())
      .forRoutes(
        LtiToolsController,
        LtiDeploymentsController,
        LtiResourceLinksController,
        LtiLaunchesController,
        LtiAssignmentsController,
      );
  }
}
