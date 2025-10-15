import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "./drizzle/client";
import { RepositoriesModule } from "./drizzle/repositories/repositories.module";

@Module({
  providers: [
    {
      provide: DrizzleClient,
      useFactory: DrizzleClient.create,
      inject: [EnvironmentVars],
    },
  ],
  exports: [DrizzleClient],
  imports: [RepositoriesModule],
})
export class DataStoreModule {}
