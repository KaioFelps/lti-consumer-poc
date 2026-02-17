import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "drizzle-kit";

expand(config());

const dbConnectionUrl = process.env.DB_CONNECTION_URL;

if (!dbConnectionUrl) throw Error("DB_CONNECTION_URL environment variable hasn't been set.");

export default defineConfig({
  out: "./drizzle",
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbConnectionUrl,
  },
  verbose: true,
});
