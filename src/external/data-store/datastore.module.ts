import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars";
import { TransactionManager } from "@/core/transaction-manager";
import { DrizzleClient } from "./drizzle/client";
import { DrizzleTransactionManager } from "./drizzle/transaction-manager";
import { Redis } from "./redis/client";
import { RepositoriesModule } from "./repositories.module";

@Module({
  providers: [
    {
      provide: DrizzleClient,
      useFactory: DrizzleClient.create,
      inject: [EnvironmentVars],
    },
    Redis,
    DrizzleTransactionManager,
    {
      provide: TransactionManager,
      useExisting: DrizzleTransactionManager,
    },
  ],
  exports: [DrizzleClient, Redis, TransactionManager, DrizzleTransactionManager],
  imports: [RepositoriesModule],
})
export class DataStoreModule {}
