import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Module({
  providers: [AuthenticateUserService],
  controllers: [AuthController],
})
export class AuthModule {}
