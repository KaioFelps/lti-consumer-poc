import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfigModule } from "./config/config.module";
import { ExternalModule } from "./external/external.module";
import { GlobalExceptionFiltersModule } from "./lib/exceptions/global-exception-filters.module";
import { MessageStringModule } from "./message-string/message-string.module";

@Module({
  imports: [
    AppConfigModule,
    MessageStringModule,
    GlobalExceptionFiltersModule,
    ExternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
