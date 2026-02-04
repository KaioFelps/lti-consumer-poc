import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { IdentityModule } from "@/modules/identity/identity.module";
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
    consumer.apply(...middlewares.mvc()).forRoutes(AuthController);
  }
}
