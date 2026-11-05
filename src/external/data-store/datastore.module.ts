import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars.js";
import { TransactionManager } from "@/core/transaction-manager.js";
import { DrizzleClient } from "./drizzle/client.js";
import { DrizzleTransactionManager } from "./drizzle/transaction-manager.js";
import { Redis } from "./redis/client.js";
import { RepositoriesModule } from "./repositories.module.js";

export const FAN_OUT_PUB = "REDIS_FAN_OUT_PUB";
export const FAN_OUT_SUB = "REDIS_FAN_OUT_SUB";

@Module({
  providers: [
    {
      provide: DrizzleClient,
      useFactory: DrizzleClient.create,
      inject: [EnvironmentVars],
    },
    Redis,
    {
      provide: FAN_OUT_PUB,
      useClass: Redis,
    },
    {
      provide: FAN_OUT_SUB,
      useClass: Redis,
    },
    DrizzleTransactionManager,
    {
      provide: TransactionManager,
      useExisting: DrizzleTransactionManager,
    },
  ],
  exports: [
    DrizzleClient,
    Redis,
    TransactionManager,
    DrizzleTransactionManager,
    FAN_OUT_PUB,
    FAN_OUT_SUB,
  ],
  imports: [RepositoriesModule],
})
export class DataStoreModule {}
