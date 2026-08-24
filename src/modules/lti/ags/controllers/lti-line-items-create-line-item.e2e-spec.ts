import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import courseContextFactory from "test/factories/course-context.factory";
import deploymentFactory from "test/factories/deployment.factory";
import externalLtiResourceFactory from "test/factories/external-lti-resource.factory";
import ltiAssignmentFactory from "test/factories/lti-assignment.factory";
import ltiLineItemFactory from "test/factories/lti-line-item.factory";
import ltiResourceLinkFactory from "test/factories/lti-resource-link.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import personFactory from "test/factories/person.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { Routes } from "@/routes";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { ContextConcreteType } from "../enums/context-concrete-type";

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

  it("should allow custom parameters in the request body as per spec", async () => {
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
        nonConformantCustomProperty: {
          canBe: true,
          anything: 100,
        },
        "https://conformant-property.example.com": {
          canContainAnyJson: true,
        },
      });

    expect(response.status).toBe(201);

    const body = response.body;
    expect(body).not.toHaveProperty("nonConformantCustomProperty");
    expect(body["https://conformant-property.example.com"]).toEqual({
      canContainAnyJson: true,
    });
  });

  it(
    "should not return an existing line item with given 'resourceId' and " +
      "'tag' in the context but that belongs to another tool",
    async () => {
      const { assignment, courseContext, tool } = await getValidItems();

      const tag = "existing-tag";

      const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
        context: courseContext,
        assignmentId: assignment.getId(),
        owningToolId: tool.id,
        label: "grade",
        tag,
      });

      const endpoint = Routes.lti.ags.lineitems.container(courseContext.id);

      const previouslyExistingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();
      expect(
        previouslyExistingLineItems.length,
        "there should be only one line items previously",
      ).toBe(1);

      const { tool: newTool } = await getValidItems();
      const { accessToken } = await getToolAndItsOidcAccessToken(app, newTool);

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .set("authorization", `Bearer ${accessToken}`)
        .set("content-type", VALID_CONTENT_TYPE)
        .send({
          scoreMaximum: lineItem.scoreMaximum,
          label: lineItem.label,
          endDateTime: lineItem.endDateTime,
          startDateTime: lineItem.startDateTime,
          tag,
        });

      expect(response.status).toBe(201);

      const body = response.body;
      const responseLineItemId: string = body.id;
      expect(
        responseLineItemId.endsWith(lineItem.id.toString()),
        "it should not have returned the existing line item",
      ).toBe(false);

      const existingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();
      expect(existingLineItems.length, "it should have created one new line item").toBe(2);
    },
  );

  describe("should not create another line item when there is already a equivalent one", async () => {
    let endpoint: string;
    let accessToken: string;
    let externalResource: ExternalLtiResource;
    let tool: LtiTool;
    let courseContext: Context<ContextConcreteType>;
    let assignment: Assignment;
    let resourceLink: LtiResourceLink;

    // gotta be before each here cuz database gets truncated between tests
    beforeEach(async () => {
      const validItems = await getValidItems();
      tool = validItems.tool;
      courseContext = validItems.courseContext;
      externalResource = validItems.resource;
      assignment = validItems.assignment;
      resourceLink = validItems.assignmentsResourceLink;

      accessToken = (await getToolAndItsOidcAccessToken(app, tool)).accessToken;
      endpoint = Routes.lti.ags.lineitems.container(courseContext.id);
    });

    const testCases = [
      {
        description: "with tag and external resource",
        setupFactory: (resource: ExternalLtiResource, _resourceLink: LtiResourceLink) => ({
          tag: "existing-tag",
          label: "grade",
          assignmentId: undefined,
          resource: resource.externalToolResourceId,
        }),
      },
      {
        description: "with tag, external resource, and resource link (through assignment)",
        setupFactory: (resource: ExternalLtiResource, resourceLink: LtiResourceLink) => ({
          tag: "existing-tag",
          label: "grade",
          assignmentId: assignment.getId(),
          resource: resource.externalToolResourceId,
          resourceLink: resourceLink,
        }),
      },
      {
        description: "with empty tag, external resource, and resource link",
        setupFactory: (resource: ExternalLtiResource, resourceLink: LtiResourceLink) => ({
          tag: "",
          label: "grade-empty-tag",
          assignmentId: assignment.getId(),
          resource: resource.externalToolResourceId,
          resourceLink: resourceLink,
        }),
      },
      {
        description: "with empty tag and resource link",
        setupFactory: (_resource: ExternalLtiResource, resourceLink: LtiResourceLink) => ({
          tag: "",
          label: "grade-empty-tag-2",
          assignmentId: assignment.getId(),
          resourceLink: resourceLink,
        }),
      },
    ];

    test.each(testCases!)("$description", async ({ setupFactory }) => {
      const specificConfig = setupFactory(externalResource, resourceLink);

      const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
        context: courseContext,
        owningToolId: tool.id,
        ...specificConfig,
      });

      const previouslyExistingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .set("authorization", `Bearer ${accessToken}`)
        .set("content-type", VALID_CONTENT_TYPE)
        .send({
          scoreMaximum: lineItem.scoreMaximum,
          label: lineItem.label,
          resourceId: lineItem?.externalResource?.externalToolResourceId,
          endDateTime: lineItem.endDateTime,
          startDateTime: lineItem.startDateTime,
          resourceLinkId: lineItem.resourceLink?.id,
          tag: lineItem.tag,
        });

      expect(response.status).toBe(201);

      const existingLineItems = await drizzle.getClient().query.ltiLineItemsT.findMany();

      expect(existingLineItems.length, "it should have created no new line item").toBe(
        previouslyExistingLineItems.length,
      );

      const body = response.body;
      // this id is presented and thus is an URL actually
      const responseLineItemId: string = body.id;
      expect(
        responseLineItemId.endsWith(lineItem.id.toString()),
        "it should have returned the existing line item",
      ).toBe(true);
    });
  });

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
