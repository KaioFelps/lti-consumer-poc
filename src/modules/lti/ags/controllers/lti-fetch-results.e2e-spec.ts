import { INestApplication } from "@nestjs/common";
import { systemRoleEnum, usersTable } from "drizzle/schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import courseContextFactory from "test/factories/course-context.factory";
import deploymentFactory from "test/factories/deployment.factory";
import externalLtiResourceFactory from "test/factories/external-lti-resource.factory";
import ltiAssignmentFactory from "test/factories/lti-assignment.factory";
import ltiLineItemFactory from "test/factories/lti-line-item.factory";
import ltiResourceLinkFactory from "test/factories/lti-resource-link.factory";
import ltiScoreFactory from "test/factories/lti-score.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import personFactory from "test/factories/person.factory";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { SystemRole } from "@/modules/identity/user/enums/system-role";
import { Routes } from "@/routes";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LtiResultServices } from "$/assignment-and-grade";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";

describe("[e2e::LTI] Fetch Results", async () => {
  let app: INestApplication<App>;
  let drizzle: DrizzleClient;
  let scoresServices: LtiResultServices;

  beforeAll(async () => {
    app = await getTestingApp();
    drizzle = app.get(DrizzleClient);
    scoresServices = app.get(LtiResultServices);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getValidItems = async ({
    amountOfScoredScores = 0,
    amountOfUnscoredScores = 0,
    scopes = [
      AssignmentAndGradeServiceScopes.ResultReadonly,
      AssignmentAndGradeServiceScopes.Score,
      AssignmentAndGradeServiceScopes.Lineitem,
    ],
  }: {
    scopes?: AssignmentAndGradeServiceScopes[];
    amountOfScoredScores?: number;
    amountOfUnscoredScores?: number;
  } = {}) => {
    const person = await personFactory.createAndPersist(drizzle);
    const instructor = Instructor.createUnchecked({ person });

    const { course, courseContext } = await courseContextFactory.createAndPersist(drizzle, {
      instructor,
    });

    // lti stuff
    const tool = await ltiToolFactory.createAndPersist(drizzle, { scopes });

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

    const lineItem = await ltiLineItemFactory.createAndPersist(drizzle, {
      context: courseContext,
      owningToolId: tool.id,
      externalResource: resource,
      assignmentId: assignment.getId(),
    });

    const scoresPromises: Promise<unknown>[] = [];

    const totalScores = amountOfScoredScores + amountOfUnscoredScores;
    for (let i = 0; i < totalScores; i++) {
      scoresPromises.push(
        (async () => {
          const student = await personFactory.createAndPersist(drizzle, {
            systemRole: SystemRole.User,
          });

          await ltiScoreFactory.createAndPersist(drizzle, {
            lineItemId: lineItem.id.toString(),
            userId: student.getUser().getId().toString(),
            score: i < amountOfScoredScores ? { given: Math.random(), maximum: 1 } : undefined,
            scoringUserId: Math.random() > 0.5 ? instructor.getId().toString() : undefined,
          });
        })(),
      );
    }

    await Promise.all(scoresPromises);

    return {
      assignmentsResourceLink,
      assignment,
      courseContext,
      resource,
      tool,
      course,
      lineItem,
      instructor,
    };
  };

  it("should use ltilib public services", async () => {
    const spy = vi.spyOn(scoresServices, "fetchResults");

    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    await request(app.getHttpServer())
      .get(Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(spy).toHaveBeenCalled();
  });

  test("the endpoint is the ID of the line item with 'results' segment appended", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    let response = await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const lineItemId: string = response.body.id;
    const lineItemEndpoint = new URL(lineItemId).pathname;
    const resultsEndpoint = `${lineItemEndpoint}/results`;

    response = await request(app.getHttpServer())
      .get(resultsEndpoint)
      .set("authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it("should fetch the results of a line item", async () => {
    const { tool, courseContext, lineItem } = await getValidItems({ amountOfScoredScores: 20 });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const limit = 10;

    const response = await request(app.getHttpServer())
      .get(
        Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()) +
          `?limit=${limit}`,
      )
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(
      response.headers["content-type"],
      "it should respond with results content-type",
    ).toContain(LtiAdvantageMediaType.ResultContainer);
    expect(response.headers["link"]).toEqual(expect.any(String));
    expect(response.body).toHaveLength(limit);
    expect(response.body, "it should present a result as per spec").toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          scoreOf: expect.any(String),
          userId: expect.any(String),
          resultScore: expect.any(Number),
          resultMaximum: expect.any(Number),
          scoringUserId: expect.any(String),
        }),
      ]),
    );
  });

  it("should require results scope", async () => {
    const { tool, courseContext, lineItem } = await getValidItems({
      scopes: [AssignmentAndGradeServiceScopes.Lineitem, AssignmentAndGradeServiceScopes.Score],
    });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    await request(app.getHttpServer())
      .get(Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(403);
  });

  it("should require results media type accept header", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    await request(app.getHttpServer())
      .get(Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()))
      .set("accept", "application/json")
      .set("authorization", `Bearer ${accessToken}`)
      .expect(406);
  });

  it("should not present unscored results", async () => {
    const { tool, courseContext, lineItem } = await getValidItems({ amountOfUnscoredScores: 10 });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const response = await request(app.getHttpServer())
      .get(Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  test("'scoreOf' URL is the endpoint to the line item owning the results", async () => {
    const { tool, courseContext, lineItem } = await getValidItems({ amountOfScoredScores: 10 });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const response = await request(app.getHttpServer())
      .get(Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scoreOf: expect.stringContaining(
            Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()),
          ),
        }),
      ]),
    );
  });

  it("it should filter by user id", async () => {
    const { tool, courseContext, lineItem } = await getValidItems({ amountOfScoredScores: 10 });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const someUser = await drizzle.getClient().query.usersTable.findFirst({
      where: eq(usersTable.systemRole, systemRoleEnum.enumValues[1]),
    });

    const endpoint = Routes.lti.ags.results.container(courseContext.id, lineItem.id.toString());
    const response = await request(app.getHttpServer())
      .get(`${endpoint}?userId=${someUser!.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body).toHaveLength(1);
  });

  it("should not let a tool list results of a line item that doesn't belong to it", async () => {
    const { courseContext, lineItem } = await getValidItems();
    const tool = await ltiToolFactory.createAndPersist(drizzle, {
      scopes: [AssignmentAndGradeServiceScopes.ResultReadonly],
    });
    await deploymentFactory.createAndPersist(drizzle, { tool, context: courseContext });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(403);
  });
});
