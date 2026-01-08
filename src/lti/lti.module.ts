import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { SessionsAndFlashMessagesMiddleware } from "@/lib/middlewares/flash-session.middleware";
import { OIDCModule } from "@/oidc/oidc.module";
import { LtiController } from "./lti.controller";

@Module({
  imports: [OIDCModule],
  controllers: [LtiController],
})
export class LtiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionsAndFlashMessagesMiddleware).forRoutes(LtiController);
  }
}
