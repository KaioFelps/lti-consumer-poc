import { Injectable, OnModuleDestroy } from "@nestjs/common";
import * as schema from "drizzle/schema";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { EnvironmentVars } from "@/config/environment-vars";

@Injectable()
export class DrizzleClient implements OnModuleDestroy {
  private constructor(
    private client: NodePgDatabase<typeof schema>,
    private readonly pool: Pool,
  ) {}

  public static create(envVars: EnvironmentVars) {
    const pool = new Pool({
      database: envVars.database.name,
      user: envVars.database.user,
      password: envVars.database.password,
      host: envVars.database.host,
      port: envVars.database.port,
    });

    const db = drizzle({
      client: pool,
      schema,
    });

    return new DrizzleClient(db, pool);
  }

  public getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
