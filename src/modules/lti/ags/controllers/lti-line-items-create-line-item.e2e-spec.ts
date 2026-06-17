import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import courseContextFactory from "test/factories/course-context.factory";
import deploymentFactory from "test/factories/deployment.factory";
import externalLtiResourceFactory from "test/factories/external-lti-resource.factory";
import ltiAssignmentFactory from "test/factories/lti-assignment.factory";
import ltiResourceLinkFactory from "test/factories/lti-resource-link.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import personFactory from "test/factories/person.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { Routes } from "@/routes";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";

/**
 * we're not covering points related to the server because the service got its own tests
 *
 * creating a line item doesn't actually enforce no 'accept' header, therefore we are
 * omitting these tests.
 */

describe("[e2e::LTI] Create Line Item", async () => {
  const VALID_CONTENT_TYPE = "application/vnd.ims.lis.v2.lineitem+json";

  let app: INestApplication<App>;
  let drizzle: DrizzleClient;

  beforeAll(async () => {
    app = await getTestingApp();
    drizzle = app.get(DrizzleClient);
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
      .post("/lti/ags/some-invalid-context-id/lineitems")
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .send({
        scoreMaximum: 100,
        label: "teste",
      });

    expect(response.status).toBe(400);
    expect(response.body["error"]).toEqual(expect.stringContaining("contexto"));
  });

  it("should require valid 'content-type' header", async () => {
    const { tool, courseContext } = await getValidItems();

    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const endpoint = Routes.lti.ags.lineitems.container(courseContext.id);

    const response = await request(app.getHttpServer())
      .post(endpoint)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .send({
        scoreMaximum: 100,
        label: "teste",
      });

    expect(response.status).toBe(415);
  });

  it.skip("should allow custom parameters in the request body as per spec", async () => {});

  it.skip("should support the specified body for creating a line item (as per spec)", async () => {});

  it("should create a line item when everything is conformant", async () => {
    const { tool, courseContext } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const endpoint = Routes.lti.ags.lineitems.container(courseContext.id);

    const response = await request(app.getHttpServer())
      .post(endpoint)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", VALID_CONTENT_TYPE)
      .send({
        scoreMaximum: 100,
        label: "teste",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        label: expect.any(String),
        scoreMaximum: expect.any(Number),
        startDateTime: null,
        endDateTime: null,
      }),
    );
  });

  it.skip("should not create another line item when there is already one with given 'resourceId' and 'tag'", async () => {});

  it.skip("should correctly find the course context", async () => {});

  test.skip("the returned line item 'id' should be the endpoint to access that line item", async () => {});

  const getValidItems = async () => {
    const person = await personFactory.createAndPersist(drizzle);
    const instructor = Instructor.createUnchecked({ person });

    const { course, courseContext } = await courseContextFactory.createAndPersist(drizzle, {
      instructor,
    });

    // lti stuff
    const tool = await ltiToolFactory.createAndPersist(drizzle, {
      scopes: [AssignmentAndGradeServiceScopes.Lineitem],
    });

    const deployment = await deploymentFactory.createAndPersist(drizzle, {
      context: courseContext,
      tool,
    });

    // every assignment connects to lti through a resource link
    const assignmentsResourceLink = await ltiResourceLinkFactory.createAndPersist(drizzle, {
      tool,
      deployment,
      context: courseContext,
    });

    // platform specific assignment
    const assignment = await ltiAssignmentFactory.createAndPersist(drizzle, {
      course,
      kind: AssignmentKind.ExternalLti,
      assignmentsResourceLink,
    });

    // assignment relating local assignment to tool's resource
    const resource = await externalLtiResourceFactory.createAndPersist(drizzle, {
      tool,
      assignment,
      context: courseContext,
    });

    return { assignmentsResourceLink, assignment, courseContext, resource, tool, course };
  };
});
