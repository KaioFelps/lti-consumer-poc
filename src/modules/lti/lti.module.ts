import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { AuthModule } from "@/modules/auth/auth.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { OIDCModule } from "@/modules/oidc/oidc.module";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services";
import { LtiDeploymentsController } from "./deployments/deployments.controller";
import { DeployToolService } from "./deployments/services/deploy-tool.service";
import { FindDeploymentByIdService } from "./deployments/services/find-deployment-by-id.service";
import { RemoveToolDeploymentService } from "./deployments/services/remove-tool-deployment.service";
import { LtiLaunchesController } from "./launches/launches.controller";
import { InitiateLaunchService } from "./launches/services/initiate-launch.service";
import { LaunchLoginService } from "./launches/services/launch-login.service";
import { LtiController } from "./lti.controller";
import { PlatformFactory } from "./platform.factory";
import { LtiResourceLinksController } from "./resource-links/resource-links.controller";
import { CreateResourceLinkService } from "./resource-links/services/create-resource-link.service";
import { DeleteResourceLinkService } from "./resource-links/services/delete-resource-link.service";
import { findResourceLinkByIdService } from "./resource-links/services/find-resource-link-by-id.service";
import { LtiToolsRepository } from "./tools/lti-tools.repository";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";
import { FindToolByIdService } from "./tools/services/find-tool-by-id.service";
import { GetToolRegistrationDetailsService } from "./tools/services/get-tool-registration-details.service";
import { LtiToolsController } from "./tools/tools.controller";

@Module({
  imports: [OIDCModule, AuthModule, IdentityModule],
  providers: [
    PlatformFactory,
    {
      provide: Platform,
      useFactory: (factory: PlatformFactory) => factory.create(),
      inject: [PlatformFactory],
    },
    {
      provide: LtiLaunchServices,
      useFactory: (
        ltiResourceLinksRepository: LtiResourceLinksRepository,
        ltiToolsRepository: LtiToolsRepository,
        launchRepository: LtiLaunchesRepository,
        platform: Platform,
      ) =>
        new LtiLaunchServices(
          ltiResourceLinksRepository,
          ltiToolsRepository,
          launchRepository,
          platform,
        ),
      inject: [LtiResourceLinksRepository, LtiToolsRepository, LtiLaunchesRepository, Platform],
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
    LaunchLoginService,
    InitiateLaunchService,
  ],
  exports: [LtiLaunchServices, Platform],
  controllers: [
    LtiController,
    LtiToolsController,
    LtiDeploymentsController,
    LtiResourceLinksController,
    LtiLaunchesController,
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
      );
  }
}
