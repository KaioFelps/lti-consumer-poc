import { INestApplication } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid";
import { ltiLineItemsT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import ltiLineItemFactory from "test/factories/lti-line-item.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { EnvironmentVars } from "@/config/environment-vars";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Routes } from "@/routes";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { EntitiesFactoryGenerator, generateEntitiesFactory } from "./tests";

describe("[e2e::LTI] Update Line Item", async () => {
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

  const getValidParams = (lineItem: LtiLineItem) => {
    return {
      scoreMaximum: lineItem.scoreMaximum,
      label: lineItem.label,
      tag: lineItem.tag,
      startDateTime: lineItem.startDateTime,
      endDateTime: lineItem.endDateTime,
      resourceId: lineItem.externalResource?.externalToolResourceId,
      customParameters: lineItem.customParameters,
    };
  };

  it("should require a valid composed context id", async () => {
    const { tool, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const response = await request(app.getHttpServer())
      .put(`/lti/ags/some-invalid-context-id/lineitems/${generateUUID()}`)
      .set("authorization", `Bearer ${accessToken}`)
      .send(getValidParams(lineItem));

    expect(response.status).toBe(400);
    expect(response.body["error"]).toEqual(expect.stringContaining("contexto"));
  });

  it("should use ltilib public services", async () => {
    // not using the internal `FindLineItemService` directly means the security
    // layer regarding headers and scopes exists.
    const spy = vi.spyOn(lineItemsServices, "update");

    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const response = await request(app.getHttpServer())
      .put(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", LtiAdvantageMediaType.LineItem)
      .send(getValidParams(lineItem))
      .expect(201);

    expect(spy).toHaveBeenCalled();

    const returnedLineItemIdUrl: string = response.body.id;
    expect(returnedLineItemIdUrl.endsWith(lineItem.id.toString())).toBeTruthy();
  });

  test("the endpoint is the ID of the line item", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const response = await request(app.getHttpServer())
      .put(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", LtiAdvantageMediaType.LineItem)
      .send(getValidParams(lineItem))
      .expect(201);

    const lineItemId: string = response.body.id;
    expect(() => new URL(lineItemId), "it should be a fully qualified URL").not.toThrow();
    expect(lineItemId.startsWith(env.app.url)).toBeTruthy();

    const lineItemEndpoint = new URL(lineItemId).pathname;

    const secondResponse = await request(app.getHttpServer())
      .put(lineItemEndpoint)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", LtiAdvantageMediaType.LineItem)
      .send({ ...response.body }) // it's also a line item and its already presented
      .expect(201);

    const finalLineItem = await drizzle.getClient().query.ltiLineItemsT.findFirst({
      where: eq(ltiLineItemsT.id, lineItem.id.toString()),
      with: { externalResource: true },
    });

    expect(finalLineItem?.startDateTime, "it should not be a random date time").toBeNullable();
    expect(finalLineItem?.endDateTime, "it should not be a random date time").toBeNullable();

    expect(response.body, "they should have brought the same line item").toEqual(
      secondResponse.body,
    );
  });

  it("should persist the changes in the database", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const overrides = {
      label: "edited!!!!",
      tag: "modified tag too",
      resourceId: "new resource id that should be created",
    } as const;

    const response = await request(app.getHttpServer())
      .put(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", LtiAdvantageMediaType.LineItem)
      .send({
        ...getValidParams(lineItem),
        ...overrides,
      })
      .expect(201);

    const returnedLineItemIdUrl: string = response.body.id;
    expect(returnedLineItemIdUrl.endsWith(lineItem.id.toString())).toBeTruthy();
    expect(response.body).toEqual(expect.objectContaining(overrides));

    const persistedLineItem = await drizzle.getClient().query.ltiLineItemsT.findFirst({
      where: eq(ltiLineItemsT.id, lineItem.id.toString()),
      with: { externalResource: true },
    });

    expect(persistedLineItem).toEqual(
      expect.objectContaining({
        label: overrides.label,
        tag: overrides.tag,
        externalResource: expect.objectContaining({
          externalToolResourceId: overrides.resourceId,
        }),
      } as typeof persistedLineItem),
    );
  });

  // because i opted to
  it("should ignore changes applied to `scoreMaximum`", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    // ensure that score maximum must differ from the original value
    const { scoreMaximum: originalScoreMaximum } = (await drizzle
      .getClient()
      .query.ltiLineItemsT.findFirst({
        where: eq(ltiLineItemsT.id, lineItem.id.toString()),
        columns: { scoreMaximum: true },
      }))!;

    const overrides = {
      // it mustn't be greater than 100 tho, as per specs, so this ensure
      scoreMaxium: ((originalScoreMaximum + 1) % 100) + 1,
    } as const;

    const response = await request(app.getHttpServer())
      .put(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", LtiAdvantageMediaType.LineItem)
      .send({
        ...getValidParams(lineItem),
        ...overrides,
      })
      .expect(201);

    const returnedLineItemIdUrl: string = response.body.id;
    expect(returnedLineItemIdUrl.endsWith(lineItem.id.toString())).toBeTruthy();
    expect(response.body.scoreMaximum).not.toBe(overrides.scoreMaxium);

    const persistedLineItem = await drizzle
      .getClient()
      .query.ltiLineItemsT.findFirst({ where: eq(ltiLineItemsT.id, lineItem.id.toString()) });
    expect(persistedLineItem?.scoreMaximum).toBe(originalScoreMaximum);
  });
});
