import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await getTestingApp();
    await app.init();
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
