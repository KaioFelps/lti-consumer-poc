import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { OIDCModule } from "@/modules/oidc/oidc.module.js";
import { EncryptionModule } from "../encryption/encryption.module.js";
import { AuthGuard } from "./guard.js";
import { LtiToolsJwtStrategy } from "./strategies/lti-tools-jwt.strategy.js";
import { SessionStrategy } from "./strategies/session.strategy.js";

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
