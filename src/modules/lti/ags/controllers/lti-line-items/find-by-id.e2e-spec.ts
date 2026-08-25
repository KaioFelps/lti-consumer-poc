import { INestApplication } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import ltiLineItemFactory from "test/factories/lti-line-item.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Routes } from "@/routes";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { EntitiesFactoryGenerator, generateEntitiesFactory } from "./tests";

describe("[e2e::LTI] Find Line Item By ID", async () => {
  let app: INestApplication<App>;
  let env: EnvironmentVars;
  let drizzle: DrizzleClient;
  let lineItemsServices: LtiLineItemServices;
  let getValidItems: EntitiesFactoryGenerator;

  beforeAll(async () => {
    app = await getTestingApp();
    drizzle = app.get(DrizzleClient);
    lineItemsServices = app.get(LtiLineItemServices);
    env = app.get(EnvironmentVars);
    getValidItems = generateEntitiesFactory(drizzle);
    await app.init();
  });

  beforeEach(async () => {});

  afterAll(async () => {
    await app.close();
  });

  it("should require a valid composed context id", async () => {
    const { tool } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const response = await request(app.getHttpServer())
      .get(`/lti/ags/some-invalid-context-id/lineitems/${generateUUID()}`)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json");

    expect(response.status).toBe(400);
    expect(response.body["error"]).toEqual(expect.stringContaining("contexto"));
  });

  it("should use ltilib public services", async () => {
    // not using the internal `FindLineItemService` directly means the security
    // layer regarding headers and scopes exists.
    const spy = vi.spyOn(lineItemsServices, "find");

    const { tool, courseContext } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
      owningToolId: tool.id,
      context: courseContext,
    });

    const response = await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .expect(200);

    expect(spy).toHaveBeenCalled();

    const returnedLineItemIdUrl: string = response.body.id;
    expect(returnedLineItemIdUrl.endsWith(lineItem.id.toString())).toBeTruthy();
    expect(
      () => new URL(returnedLineItemIdUrl),
      "it should be presented so that its ID is a URL",
    ).not.toThrow();
  });

  test("the endpoint is the ID of the line item", async () => {
    const { tool, courseContext } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
      owningToolId: tool.id,
      context: courseContext,
    });

    const response = await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .expect(200);

    const lineItemId: string = response.body.id;
    expect(() => new URL(lineItemId), "it should be a fully qualified URL").not.toThrow();
    expect(lineItemId.startsWith(env.app.url)).toBeTruthy();

    const lineItemEndpoint = new URL(lineItemId).pathname;

    const secondResponse = await request(app.getHttpServer())
      .get(lineItemEndpoint)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .expect(200);

    expect(response.body, "they should have brought the same line item").toEqual(
      secondResponse.body,
    );
  });
});
