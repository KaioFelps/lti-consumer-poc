import { join } from "node:path";
import * as schema from "drizzle/schema";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { reset } from "drizzle-seed";
import { Pool } from "pg";
import { StartedTestContainer } from "testcontainers";
import { loadMessageStrings } from "@/message-string/loader";
import { getPostgresContainer, getRedisContainer } from "./fixtures/containers";

let redisContainer: StartedTestContainer;
let postgresContainer: StartedTestContainer;

let client: Pool;
let db: NodePgDatabase<typeof schema>;

const migrateDatabase = async () => {
  const migrationsDirectory = join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder: migrationsDirectory });
};

beforeAll(async () => {
  await loadMessageStrings();
  redisContainer = await getRedisContainer();
  postgresContainer = await getPostgresContainer();

  client = new Pool({ connectionString: process.env.DB_CONNECTION_URL });
  db = drizzle({ client, schema });

  // we need to migrate it here too because some `testingApp` might be initialized by
  // tests suits in `beforeAll` hooks — test suit `beforeAll` hooks still runs
  // before the global `beforeEach` hook... It'd cause them to try to deal with the
  // database when it haven't been migrated yet.
  await migrateDatabase();
});

beforeEach(async () => {
  await migrateDatabase();
});

afterEach(async () => {
  await reset(db, schema);
});

afterAll(async () => {
  await client.end();
  await redisContainer.stop();
  await postgresContainer.stop();
});
