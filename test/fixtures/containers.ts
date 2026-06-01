import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer } from "testcontainers";

export async function getRedisContainer() {
  process.env.REDIS_USER = "test_redis";
  process.env.REDIS_PASSWORD = "test_redis";

  const redisContainer = await new GenericContainer("redis/redis-stack-server:latest")
    .withExposedPorts(6379) // Redis internal exposed port
    .withEnvironment({
      REDIS_ARGS: [
        `--requirepass ${process.env.REDIS_PASSWORD}`,
        `--user ${process.env.REDIS_USER}`,
        `on >${process.env.REDIS_PASSWORD} allkeys allcommands +@all`,
      ].join(" "),
    })
    .start();

  process.env.REDIS_PORT = redisContainer.getFirstMappedPort().toString();
  process.env.REDIS_HOST = redisContainer.getHost();

  return redisContainer;
}

export async function getPostgresContainer() {
  const container = await new PostgreSqlContainer("postgres:18").start();

  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_PORT = container.getPort().toString();
  process.env.DB_HOST = container.getHost();
  process.env.DB_CONNECTION_URL = container.getConnectionUri();

  return container;
}
