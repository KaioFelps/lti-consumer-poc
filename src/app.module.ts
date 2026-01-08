import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { AppConfigModule } from "./config/config.module";
import { ExternalModule } from "./external/external.module";
import { IdentityModule } from "./identity/identity.module";
import { GlobalExceptionFiltersModule } from "./lib/globals/exception-filters.module";
import { GlobalGuardsModule } from "./lib/globals/guards.module";
import { GlobalInterceptorsModule } from "./lib/globals/interceptors.module";
import { LtiModule } from "./lti/lti.module";
import { MessageStringModule } from "./message-string/message-string.module";
import { OIDCModule } from "./oidc/oidc.module";

@Module({
  imports: [
    AppConfigModule,
    MessageStringModule,
    GlobalGuardsModule,
    GlobalInterceptorsModule,
    GlobalExceptionFiltersModule,
    ExternalModule,
    AuthModule,
    IdentityModule,
    OIDCModule,
    LtiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
