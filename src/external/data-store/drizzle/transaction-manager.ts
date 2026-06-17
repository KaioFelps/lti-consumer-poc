import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import * as schema from "drizzle/schema";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import { TransactionManager } from "@/core/transaction-manager";
import { DrizzleClient } from "./client";

type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

// it seems it doesn't actually need to be request-scoped
@Injectable()
export class DrizzleTransactionManager extends TransactionManager<Transaction> {
  private readonly storage = new AsyncLocalStorage<Transaction>();

  public constructor(private readonly drizzle: DrizzleClient) {
    super();
  }

  public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.drizzle.getClient().transaction(async (tx) => {
      return this.storage.run(tx, work);
    });
  }

  public getTx(): Transaction | undefined {
    return this.storage.getStore();
  }

  public rollback() {
    const tx = this.getTx();
    if (tx) tx.rollback();
  }
}
