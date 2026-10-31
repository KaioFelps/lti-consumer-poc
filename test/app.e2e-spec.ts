import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { getTestingApp } from "test/index.js";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await getTestingApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/ (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/")
      .accept("text/html")
      .send()
      .expect(200);

    expect(response.text).toEqual(expect.stringContaining("não está autorizado"));
  });
});
