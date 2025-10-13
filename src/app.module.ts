import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfigModule } from "./config/config.module";
import { DataStoreModule } from "./data-store/datastore.module";
import { GlobalExceptionFiltersModule } from "./lib/exceptions/global-exception-filters.module";
import { MessageStringModule } from "./message-string/message-string.module";

@Module({
  imports: [
    AppConfigModule,
    MessageStringModule,
    DataStoreModule,
    GlobalExceptionFiltersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
