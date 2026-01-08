import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { AuthUserSessionMiddleware } from "@/lib/middlewares/auth-user-session.middleware";
import { SessionsAndFlashMessagesMiddleware } from "@/lib/middlewares/flash-session.middleware";
import { OIDCModule } from "@/oidc/oidc.module";
import { Platform } from "$/core/platform";
import { LtiController } from "./lti.controller";
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
  ],
  exports: [Platform],
  controllers: [LtiController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionsAndFlashMessagesMiddleware, AuthUserSessionMiddleware)
      .forRoutes(LtiController);
  }
}
