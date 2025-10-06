import z from "zod";

export const environmentVariablesSchema = z.object({
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_PORT: z.coerce.number(),
  DB_HOST: z.string(),
});

export type EnvironmentVariablesSchema = z.infer<
  typeof environmentVariablesSchema
>;
