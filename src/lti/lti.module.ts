import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import middlewares from "@/lib/middlewares";
import { OIDCModule } from "@/oidc/oidc.module";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { LtiController } from "./lti.controller";
import { PlatformFactory } from "./platform.factory";
import { LtiToolsRepository } from "./tools/lti-tools.repository";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";

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
    FindManyToolsPreviewsService,
  ],
  exports: [LtiLaunchServices, Platform],
  controllers: [LtiController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(LtiController);
  }
}
