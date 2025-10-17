import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { AppConfigModule } from "./config/config.module";
import { ExternalModule } from "./external/external.module";
import { IdentityModule } from "./identity/identity.module";
import { GlobalExceptionFiltersModule } from "./lib/exceptions/global-exception-filters.module";
import { MessageStringModule } from "./message-string/message-string.module";

@Module({
  imports: [
    AppConfigModule,
    MessageStringModule,
    GlobalExceptionFiltersModule,
    ExternalModule,
    AuthModule,
    IdentityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
