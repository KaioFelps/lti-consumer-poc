import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import middlewares from "@/lib/middlewares";
import { OIDCModule } from "@/oidc/oidc.module";
import { Platform } from "$/core/platform";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { LtiController } from "./lti.controller";
import { LtiToolsRepository } from "./lti-tools.repository";
import { PlatformFactory } from "./platform.factory";

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
  ],
  exports: [LtiLaunchServices, Platform],
  controllers: [LtiController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(LtiController);
  }
}
