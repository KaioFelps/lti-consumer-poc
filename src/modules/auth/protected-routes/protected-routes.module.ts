import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EncryptionModule } from "../encryption/encryption.module";
import { AuthGuard } from "./guard";
import { LtiToolsJwtStrategy } from "./strategies/lti-tools-jwt.strategy";
import { SessionStrategy } from "./strategies/session.strategy";

@Module({
  imports: [EncryptionModule],
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
