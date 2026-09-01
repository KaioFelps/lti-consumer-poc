import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import deploymentFactory from "test/factories/deployment.factory";
import ltiLineItemFactory from "test/factories/lti-line-item.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Routes } from "@/routes";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { EntitiesFactoryGenerator, generateEntitiesFactory } from "./tests";

describe("[e2e::LTI] Delete Line Item", async () => {
  let app: INestApplication<App>;
  let env: EnvironmentVars;
  let drizzle: DrizzleClient;
  let lineItemsServices: LtiLineItemServices;
  let getValidItems: () => Promise<
    Awaited<ReturnType<EntitiesFactoryGenerator>> & { lineItem: LtiLineItem }
  >;

  beforeAll(async () => {
    app = await getTestingApp();
    drizzle = app.get(DrizzleClient);
    lineItemsServices = app.get(LtiLineItemServices);
    env = app.get(EnvironmentVars);

    getValidItems = async () => {
      const { courseContext, tool, resource, assignment, ...items } =
        await generateEntitiesFactory(drizzle)();

      const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
        context: courseContext,
        owningToolId: tool.id,
        externalResource: resource,
        assignmentId: assignment.getId(),
      });

      return { ...items, courseContext, tool, resource, assignment, lineItem };
    };

    await app.init();
  });

  beforeEach(async () => {});

  afterAll(async () => {
    await app.close();
  });

  it("should use ltilib public services", async () => {
    // not using the internal `FindLineItemService` directly means the security
    // layer regarding headers and scopes exists.
    const spy = vi.spyOn(lineItemsServices, "delete");

    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    await request(app.getHttpServer())
      .delete(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(spy).toHaveBeenCalled();
  });

  test("the endpoint is the ID of the line item", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const response = await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const lineItemId: string = response.body.id;
    expect(() => new URL(lineItemId), "it should be a fully qualified URL").not.toThrow();
    expect(lineItemId.startsWith(env.app.url)).toBeTruthy();

    const lineItemEndpoint = new URL(lineItemId).pathname;
    await request(app.getHttpServer())
      .delete(lineItemEndpoint)
      .set("authorization", `Bearer ${accessToken}`);

    expect(response.status, "endpoint should be the ID of the presented line item").not.toBe(404);
  });

  it("should delete the line item from the database", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    await request(app.getHttpServer())
      .delete(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const existingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();
    expect(existingLineItems.length, "it should have deleted the line item").toBe(0);
  });

  it("should not let a tool delete a line item that doesn't belong to it", async () => {
    const lineItemsToDelete: LtiLineItem[] = [];

    const { courseContext, lineItem, tool } = await getValidItems();
    lineItemsToDelete.push(lineItem);
    lineItemsToDelete.push(
      await ltiLineItemFactory.createAndPersist(drizzle, {
        owningToolId: tool.id,
        context: courseContext,
      }),
    );

    const differentTool = await ltiToolFactory.createAndPersist(drizzle, {
      scopes: [AssignmentAndGradeServiceScopes.Lineitem],
    });

    await deploymentFactory.createAndPersist(drizzle, {
      tool: differentTool,
      context: courseContext,
    });

    const { accessToken } = await getToolAndItsOidcAccessToken(app, differentTool);

    for (const lineItem of lineItemsToDelete) {
      await request(app.getHttpServer())
        .delete(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);
    }

    const existingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();
    expect(existingLineItems.length, "it should not have deleted the line item").toBe(2);
  });
});
