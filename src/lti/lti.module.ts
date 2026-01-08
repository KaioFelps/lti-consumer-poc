import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthUserSessionMiddleware } from "@/lib/middlewares/auth-user-session.middleware";
import { SessionsAndFlashMessagesMiddleware } from "@/lib/middlewares/flash-session.middleware";
import { OIDCModule } from "@/oidc/oidc.module";
import { LtiController } from "./lti.controller";

@Module({
  imports: [OIDCModule],
  controllers: [LtiController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionsAndFlashMessagesMiddleware, AuthUserSessionMiddleware)
      .forRoutes(LtiController);
  }
}
