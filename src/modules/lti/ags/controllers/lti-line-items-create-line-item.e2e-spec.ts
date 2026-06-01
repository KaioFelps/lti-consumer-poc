import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import { Redis } from "@/external/data-store/redis/client";

describe("[e2e::LTI] Line Item's ID must be compliant", async () => {
  let app: INestApplication<App>;
  let redis: Redis;

  beforeAll(async () => {
    app = await getTestingApp();

    redis = app.get(Redis);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("redis", async () => {
    console.log("redis dump", await redis.client.dump("foo"));
  });
});
