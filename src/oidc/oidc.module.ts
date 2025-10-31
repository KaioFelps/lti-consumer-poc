import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { EnvironmentVars } from "@/config/environment-vars";
import { OIDCController } from "./oidc.controller";
import { OIDCProvider } from "./provider";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { OIDCClientsRepository } from "./repositories/clients.repository";

@Module({
  controllers: [OIDCController],
  providers: [
    {
      provide: OIDCProvider,
      useFactory: OIDCProvider.create,
      inject: [EnvironmentVars, OIDCClientsRepository, OIDCAccountsRepository],
    },
  ],
  imports: [AuthModule],
})
export class OIDCModule {}
