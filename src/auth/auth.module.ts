import { Module } from "@nestjs/common";
import { IdentityModule } from "@/identity/identity.module";
import { AuthController } from "./auth.controller";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Module({
  providers: [AuthenticateUserService],
  controllers: [AuthController],
  imports: [IdentityModule],
})
export class AuthModule {}
