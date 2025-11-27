import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "./drizzle/client";
import { RepositoriesModule } from "./drizzle/repositories/repositories.module";
import { Redis } from "./redis/client";

@Module({
  providers: [
    {
      provide: DrizzleClient,
      useFactory: DrizzleClient.create,
      inject: [EnvironmentVars],
    },
    Redis,
  ],
  exports: [DrizzleClient, Redis],
  imports: [RepositoriesModule],
})
export class DataStoreModule {}
