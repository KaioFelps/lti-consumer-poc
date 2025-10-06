import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfigModule } from "./config/config.module";
import { DataStoreModule } from "./data-store/datastore.module";

@Module({
  imports: [AppConfigModule, DataStoreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
