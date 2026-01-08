import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { IdentityModule } from "@/identity/identity.module";
import { AuthUserSessionMiddleware } from "@/lib/middlewares/auth-user-session.middleware";
import { SessionsAndFlashMessagesMiddleware } from "@/lib/middlewares/flash-session.middleware";
import { AuthController } from "./auth.controller";
import { EncryptionModule } from "./encryption/encryption.module";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Module({
  providers: [AuthenticateUserService],
  exports: [AuthenticateUserService, EncryptionModule],
  controllers: [AuthController],
  imports: [IdentityModule, EncryptionModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionsAndFlashMessagesMiddleware, AuthUserSessionMiddleware)
      .forRoutes(AuthController);
  }
}
