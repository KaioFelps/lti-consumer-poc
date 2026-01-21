import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import middlewares from "@/lib/middlewares";
import { OIDCModule } from "@/oidc/oidc.module";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services";
import { LtiDeploymentsController } from "./deployments/deployments.controller";
import { DeployToolService } from "./deployments/services/deploy-tool.service";
import { FindDeploymentByIdService } from "./deployments/services/find-deployment-by-id.service";
import { RemoveToolDeploymentService } from "./deployments/services/remove-tool-deployment.service";
import { PlatformFactory } from "./platform.factory";
import { CreateResourceLinkService } from "./resource-links/services/create-resource-link.service";
import { LtiToolsRepository } from "./tools/lti-tools.repository";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";
import { FindToolByIdService } from "./tools/services/find-tool-by-id.service";
import { GetToolRegistrationDetailsService } from "./tools/services/get-tool-registration-details.service";
import { LtiToolsController } from "./tools/tools.controller";

@Module({
  imports: [OIDCModule, AuthModule],
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
        ltiResourceLinksRepository: LtiResourceLinksRepository<IrrecoverableError>,
        ltiToolsRepository: LtiToolsRepository,
        platform: Platform,
      ) =>
        new LtiLaunchServices(
          ltiResourceLinksRepository,
          ltiToolsRepository,
          platform,
        ),
      inject: [LtiResourceLinksRepository, LtiToolsRepository, Platform],
    },
    {
      provide: LtiResourceLinkServices,
      inject: [LtiResourceLinksRepository],
      useFactory: (
        resourceLinksRepository: LtiResourceLinksRepository<IrrecoverableError>,
      ) => new LtiResourceLinkServices(resourceLinksRepository),
    },
    FindManyToolsPreviewsService,
    FindToolByIdService,
    DeployToolService,
    GetToolRegistrationDetailsService,
    RemoveToolDeploymentService,
    FindDeploymentByIdService,
    CreateResourceLinkService,
  ],
  exports: [LtiLaunchServices, Platform],
  controllers: [LtiToolsController, LtiDeploymentsController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(...middlewares.mvc())
      .forRoutes(LtiToolsController, LtiDeploymentsController);
  }
}
