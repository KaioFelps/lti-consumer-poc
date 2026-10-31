import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars.js";
import { TransactionManager } from "@/core/transaction-manager.js";
import { DrizzleClient } from "./drizzle/client.js";
import { DrizzleTransactionManager } from "./drizzle/transaction-manager.js";
import { Redis } from "./redis/client.js";
import { RepositoriesModule } from "./repositories.module.js";

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
