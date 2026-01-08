import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { IdentityModule } from "@/identity/identity.module";
import { SessionsAndFlashMessagesMiddleware } from "@/lib/middlewares/flash-session.middleware";
import { AuthController } from "./auth.controller";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Module({
  providers: [AuthenticateUserService],
  exports: [AuthenticateUserService],
  controllers: [AuthController],
  imports: [IdentityModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionsAndFlashMessagesMiddleware)
      .forRoutes(AuthController);
  }
}
