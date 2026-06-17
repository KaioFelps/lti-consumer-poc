import { INestApplication } from "@nestjs/common";
import supertest from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import { injectMockedLtiToolRecord, prepareToolOidcTokenRequest } from "test/fixtures/oidc";
import { UnsafeOIDCClientsInjectionContainer } from "@/modules/oidc/unsafe-clients-injection-container";
import { Routes } from "@/routes";
import { Platform } from "$/core/platform";

describe("[e2e::LTI] LTI Tools should be able to get an access token", async () => {
  const tokenEndpoint = Routes.oidc.token();
  let app: INestApplication<App>;
  let unsafeContainer: UnsafeOIDCClientsInjectionContainer;
  let platform: Platform;

  beforeAll(async () => {
    app = await getTestingApp();
    unsafeContainer = app.get(UnsafeOIDCClientsInjectionContainer);
    platform = app.get(Platform);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should authenticate a valid tool and sign it an access JWT", async () => {
    const clientFinder = vi.spyOn(
      UnsafeOIDCClientsInjectionContainer.prototype,
      "__findClientMetadataFromUnsafeCache",
    );

    const client = await injectMockedLtiToolRecord(unsafeContainer);

    const { body } = await prepareToolOidcTokenRequest(platform, client);

    const response = await supertest(app.getHttpServer())
      .post(tokenEndpoint)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(body);

    expect(clientFinder).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body["access_token"]).toBeTypeOf("string");
  });
});
