import { Module } from "@nestjs/common";
import { AppConfigModule } from "@/config/config.module";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "./drizzle/client";

@Module({
  providers: [
    {
      provide: DrizzleClient,
      useFactory: DrizzleClient.create,
      inject: [EnvironmentVars],
    },
  ],
  exports: [DrizzleClient],
  imports: [AppConfigModule],
})
export class DataStoreModule {}
