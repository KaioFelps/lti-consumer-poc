import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares.js";
import { IdentityModule } from "@/modules/identity/identity.module.js";
import { AuthController } from "./auth.controller.js";
import { EncryptionModule } from "./encryption/encryption.module.js";
import { AuthenticateUserService } from "./services/authenticate-user.service.js";

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
