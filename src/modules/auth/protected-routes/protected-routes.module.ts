import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { OIDCModule } from "@/modules/oidc/oidc.module";
import { EncryptionModule } from "../encryption/encryption.module";
import { AuthGuard } from "./guard";
import { LtiToolsJwtStrategy } from "./strategies/lti-tools-jwt.strategy";
import { SessionStrategy } from "./strategies/session.strategy";

@Module({
  imports: [EncryptionModule, OIDCModule],
  providers: [
    SessionStrategy,
    LtiToolsJwtStrategy,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class ProtectedRoutesModule {}
