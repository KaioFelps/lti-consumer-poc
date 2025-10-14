import { Injectable } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { EnvironmentVars } from "@/config/environment-vars";

@Injectable()
export class DrizzleClient {
  private constructor(private client: NodePgDatabase) {}

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
    });

    return new DrizzleClient(db);
  }

  public getClient() {
    return this.client;
  }
}
