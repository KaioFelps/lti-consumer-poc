import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares.js";
import { AuthModule } from "@/modules/auth/auth.module.js";
import { IdentityModule } from "@/modules/identity/identity.module.js";
import { OIDCModule } from "@/modules/oidc/oidc.module.js";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository.js";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { LtiScoresRepository } from "$/assignment-and-grade/repositories.js";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim.services.js";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item.services.js";
import { LtiResultServices, LtiScoreServices } from "$/assignment-and-grade.js";
import { Platform } from "$/core/platform.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository.js";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository.js";
import { LtiLaunchServices } from "$/core/services/launch.services.js";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services.js";
import { AssignmentsAndGradesModule } from "../assignments-and-grades/assignments-and-grades.module.js";
import { CoursesModule } from "../courses-and-enrollments/courses.module.js";
import { ContextFetchersModule } from "./advantage/context/fetchers/context-fetchers.module.js";
import { FindContextByIdService } from "./advantage/context/services/find-context-by-id.service.js";
import { LtiContextsRepository } from "./advantage/repositories/lti-contexts.repository.js";
import { LtiAssignmentsController } from "./ags/controllers/lti-assignments.controller.js";
import { LtiLineItemsController } from "./ags/controllers/lti-line-items/index.js";
import { LtiResultsController } from "./ags/controllers/lti-results.controller.js";
import { LtiScoresController } from "./ags/controllers/lti-scores.controller.js";
import { ChooseMainLineItemService } from "./ags/services/choose-main-line-item.service.js";
import { CreateCourseContextService } from "./ags/services/create-course-context.service.js";
import { CreateExternalLtiAssignmentService } from "./ags/services/create-external-lti-assignment.service.js";
import { FindAssignmentGradingDetailsService } from "./ags/services/find-assignment-grading-details.service.js";
import { FindExternalLtiAssignmentByIdService } from "./ags/services/find-external-lti-assignment-by-id.service.js";
import { FindStudentScoreDetailsByExternalAssignmentIdService } from "./ags/services/find-student-score-details-by-assignment-id.service.js";
import { LtiDeploymentsController } from "./deployments/deployments.controller.js";
import { DeployToolService } from "./deployments/services/deploy-tool.service.js";
import { FindDeploymentByIdService } from "./deployments/services/find-deployment-by-id.service.js";
import { RemoveToolDeploymentService } from "./deployments/services/remove-tool-deployment.service.js";
import { LtiLaunchesController } from "./launches/launches.controller.js";
import { InitiateLaunchService } from "./launches/services/initiate-launch.service.js";
import { LtiController } from "./lti.controller.js";
import { PlatformFactory } from "./platform.factory.js";
import { LtiResourceLinksController } from "./resource-links/resource-links.controller.js";
import { CreateResourceLinkService } from "./resource-links/services/create-resource-link.service.js";
import { DeleteResourceLinkService } from "./resource-links/services/delete-resource-link.service.js";
import { findResourceLinkByIdService } from "./resource-links/services/find-resource-link-by-id.service.js";
import { LtiToolsRepository } from "./tools/lti-tools.repository.js";
import { LtiToolsDeploymentsRepository } from "./tools/lti-tools-deployments.repository.js";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service.js";
import { FindToolByIdService } from "./tools/services/find-tool-by-id.service.js";
import { GetToolRegistrationDetailsService } from "./tools/services/get-tool-registration-details.service.js";
import { LtiToolsController } from "./tools/tools.controller.js";
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
      provide: LtiScoreServices,
      inject: [
        Platform,
        LtiScoresRepository,
        LtiToolsDeploymentsRepository,
        LtiLineItemsRepository,
      ],
      useFactory: (
        platform: Platform,
        scoresRepository: LtiScoresRepository,
        deploymentsRepository: LtiToolsDeploymentsRepository,
        lineItemsRepository: LtiLineItemsRepository,
      ) =>
        new LtiScoreServices(
          platform,
          scoresRepository,
          deploymentsRepository,
          lineItemsRepository,
        ),
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
        contextsRepository: LtiContextsRepository,
      ) =>
        new LtiLaunchServices(
          ltiResourceLinksRepository,
          ltiToolsRepository,
          launchRepository,
          userIdentitiesRepository,
          platform,
          agsClaimServices,
          contextsRepository,
        ),
      inject: [
        LtiResourceLinksRepository,
        LtiToolsRepository,
        LtiLaunchesRepository,
        Platform,
        LtiUserIdentitiesRespository,
        LtiAgsClaimServices,
        LtiContextsRepository,
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
    CreateCourseContextService,
    {
      provide: LtiResultServices,
      inject: [
        Platform,
        LtiScoresRepository,
        LtiToolsDeploymentsRepository,
        LtiLineItemsRepository,
      ],
      useFactory: (
        platform: Platform,
        scoresRepository: LtiScoresRepository,
        deploymentsRepository: LtiToolsDeploymentsRepository,
        lineItemsRepository: LtiLineItemsRepository,
      ) =>
        new LtiResultServices(
          platform,
          scoresRepository,
          deploymentsRepository,
          lineItemsRepository,
        ),
    },
    FindStudentScoreDetailsByExternalAssignmentIdService,
    ChooseMainLineItemService,
    FindAssignmentGradingDetailsService,
  ],
  exports: [LtiLaunchServices, Platform, CreateCourseContextService],
  controllers: [
    LtiController,
    LtiToolsController,
    LtiDeploymentsController,
    LtiResourceLinksController,
    LtiLaunchesController,
    LtiAssignmentsController,
    LtiLineItemsController,
    LtiScoresController,
    LtiResultsController,
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
