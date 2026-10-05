import { INestApplication } from "@nestjs/common";
import { ClassProperties } from "common/src/types/class-properties";
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
import { Routes } from "@/routes";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LtiScoreServices } from "$/assignment-and-grade";
import { LtiScore } from "$/assignment-and-grade/entities";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { ScoreDTO } from "../dtos/score.dto";

describe("[e2e::LTI] Publish Score", async () => {
  let app: INestApplication<App>;
  let drizzle: DrizzleClient;
  let scoresServices: LtiScoreServices;

  beforeAll(async () => {
    app = await getTestingApp();
    drizzle = app.get(DrizzleClient);
    scoresServices = app.get(LtiScoreServices);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getValidItems = async ({
    scopes = [AssignmentAndGradeServiceScopes.Score, AssignmentAndGradeServiceScopes.Lineitem],
  }: {
    scopes?: AssignmentAndGradeServiceScopes[];
  } = {}) => {
    const person = await personFactory.createAndPersist(drizzle);
    const instructor = Instructor.createUnchecked({ person });

    const student = await personFactory.createAndPersist(drizzle);

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

    return {
      assignmentsResourceLink,
      assignment,
      courseContext,
      resource,
      tool,
      course,
      lineItem,
      student,
      instructor,
    };
  };

  it("should use ltilib public services", async () => {
    const spy = vi.spyOn(scoresServices, "publish");

    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`);

    expect(spy).toHaveBeenCalled();
  });

  test("the endpoint is the ID of the line item with 'scores' segment appended", async () => {
    const { tool, courseContext, lineItem } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    let response = await request(app.getHttpServer())
      .get(Routes.lti.ags.lineitems.instance(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const lineItemId: string = response.body.id;
    const lineItemEndpoint = new URL(lineItemId).pathname;
    const scoreEndpoint = `${lineItemEndpoint}/scores`;

    response = await request(app.getHttpServer())
      .post(scoreEndpoint)
      .set("authorization", `Bearer ${accessToken}`);

    expect(response.status).not.toBe(404);
  });

  it("should create a new score for a line item", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const timestamp = new Date();

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Initialized,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        userId: student.getUser().getId().toString(),
        timestamp: timestamp.toISOString(),
      } satisfies ClassProperties<ScoreDTO>)
      .expect(204);

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(1);
    expect(scoresInDb[0]).toEqual(
      expect.objectContaining({
        activityProgress: LtiScore.ActivityProgress.Initialized,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        timestamp,
        userId: student.getUser().getId().toString(),
      }),
    );
  });

  it("should require score scope", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems({ scopes: [] });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Initialized,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        timestamp: new Date().toISOString(),
        userId: student.getUser().getId().toString(),
      } satisfies ClassProperties<ScoreDTO>)
      .expect(403);
  });

  it("should require score content type", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Initialized,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        timestamp: new Date().toISOString(),
        userId: student.getUser().getId().toString(),
      } satisfies ClassProperties<ScoreDTO>)
      .expect(415);
  });

  it("should update every field of an existing score with the incoming values", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const timestamp = new Date();

    await ltiScoreFactory.createAndPersist(drizzle, {
      lineItemId: lineItem.id.toString(),
      userId: student.getUser().getId().toString(),
      timestamp: new Date(timestamp.getTime() - 200),
    });

    const submittedAt = new Date();

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Started,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        userId: student.getUser().getId().toString(),
        timestamp: timestamp.toISOString(),
        comment: "tereré",
        scoreGiven: 100,
        scoreMaximum: 100,
        submission: { submittedAt: submittedAt.toISOString() },
        "https://example.com/new-custom": true,
      })
      .expect(204);

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(1);
    expect(scoresInDb[0]).toEqual(
      expect.objectContaining({
        activityProgress: LtiScore.ActivityProgress.Started,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        userId: student.getUser().getId().toString(),
        timestamp,
        comment: "tereré",
        scoreGiven: 100,
        scoreMaximum: 100,
        customParameters: { "https://example.com/new-custom": true },
        submittedAt,
        lineItemId: lineItem.id.toString(),
        startedAt: expect.any(Date),
      }),
    );
  });

  it("should unset values set to 'undefined'", async () => {
    const { tool, courseContext, lineItem, student, instructor } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const timestamp = new Date();

    await ltiScoreFactory.createAndPersist(drizzle, {
      activityProgress: LtiScore.ActivityProgress.Started,
      lineItemId: lineItem.id.toString(),
      userId: student.getUser().getId().toString(),
      timestamp: new Date(timestamp.getTime() - 200),
      comment: "tereré",
      score: {
        given: 100,
        maximum: 100,
      },
      submission: { startedAt: timestamp.toISOString() },
      scoringUserId: instructor.getId().toString(),
      customParameters: {
        "https://example.com/new-custom": true,
      },
    });

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Started,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        userId: student.getUser().getId().toString(),
        timestamp: new Date(timestamp.getTime() + 100).toISOString(),
        comment: undefined,
        scoreGiven: undefined,
        scoreMaximum: undefined,
        scoringUserId: undefined,
        submission: { startedAt: undefined },
      })
      .expect(204);

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(1);
    expect(scoresInDb[0]).toEqual(
      expect.objectContaining({
        activityProgress: LtiScore.ActivityProgress.Started,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        userId: student.getUser().getId().toString(),
        comment: null,
        scoreGiven: null,
        scoreMaximum: null,
        scoringUserId: null,
        customParameters: {},
        lineItemId: lineItem.id.toString(),
        timestamp: expect.any(Date),
        startedAt: expect.any(Date),
        submittedAt: null,
      }),
    );
  });

  it("should let the comment as stored when body's comment is 'null'", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const score = await ltiScoreFactory.createAndPersist(drizzle, {
      lineItemId: lineItem.id.toString(),
      userId: student.getUser().getId().toString(),
      comment: "tereré",
    });

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        userId: score.userId,
        timestamp: score.timestamp,
        scoreGiven: score.score?.given,
        scoreMaximum: score.score?.maximum,
        scoringUserId: score.scoringUserId,
        submission: score.submission,
        //
        comment: null,
      })
      .expect(204);

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(1);
    expect(scoresInDb[0].comment).toBe("tereré");
  });

  it("should not update a score when the timestamp is outdated", async () => {
    const { tool, courseContext, lineItem, student } = await getValidItems();
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

    const timestamp = new Date();

    const score = await ltiScoreFactory.createAndPersist(drizzle, {
      lineItemId: lineItem.id.toString(),
      userId: student.getUser().getId().toString(),
      comment: "tereré",
      timestamp,
    });

    const response = await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Completed,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        userId: score.userId,
        timestamp: new Date(timestamp.getTime() - 100).toISOString(),
        comment: "foo",
      })
      .expect(422);

    expect(response.body).toEqual(
      expect.objectContaining({
        errors: {
          timestamp: [expect.objectContaining({ message: expect.any(String) })],
        },
      }),
    );
    expect(response.body.errors.timestamp[0].message).toContain("desatualizada");

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(1);
    expect(scoresInDb[0], "it should not have updated the score in the datastore").toEqual(
      expect.objectContaining({
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        userId: score.userId,
        timestamp: score.timestamp,
        scoreGiven: score.score?.given ?? null,
        scoreMaximum: score.score?.maximum ?? null,
        scoringUserId: score.scoringUserId ?? null,
        submittedAt: score.submission?.submittedAt ?? null,
        startedAt: score.submission?.startedAt ?? null,
        comment: score.comment ?? null,
      }),
    );
  });

  describe.each(["timestamp", "submittedAt", "startedAt"])(
    "$0 datetime errors resolution",
    async (field) => {
      test.each([
        [
          "no sub-seconds precision",
          new Date(Date.now() + 100).toISOString().match(/\d{4}-\d{2}-\d{2}T(\d{2}:){2}\d{2}/)![0],
        ],
        ["no timezone designator", new Date(Date.now() + 100).toISOString().replace("Z", "")],
        ["invalid datetime string", "not-a-date-string-at-all"],
      ])("$0", async (_, invalidTimestamp) => {
        const { tool, courseContext, lineItem, student } = await getValidItems();
        const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);

        const override =
          field === "timestamp"
            ? { timestamp: invalidTimestamp }
            : { submission: { [field]: invalidTimestamp } };

        const response = await request(app.getHttpServer())
          .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
          .set("content-type", LtiAdvantageMediaType.Score)
          .set("authorization", `Bearer ${accessToken}`)
          .send({
            activityProgress: LtiScore.ActivityProgress.Initialized,
            gradingProgress: LtiScore.GradingProgress.NotReady,
            userId: student.getUser().getId().toString(),
            timestamp: new Date().toISOString(),
            ...override,
          } satisfies ClassProperties<ScoreDTO>)
          .expect(422);

        const expectation = expect.objectContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]);

        const innerObjectExpect =
          field === "timestamp"
            ? { [field]: expectation }
            : { submission: { [field]: expectation } };

        expect(response.body).toEqual(expect.objectContaining({ errors: innerObjectExpect }));
      });
    },
  );

  it("should not let a tool publish a score to a line item that doesn't belong to it", async () => {
    const { courseContext, lineItem, student } = await getValidItems();
    const tool = await ltiToolFactory.createAndPersist(drizzle, {
      scopes: [AssignmentAndGradeServiceScopes.Score, AssignmentAndGradeServiceScopes.Lineitem],
    });
    await deploymentFactory.createAndPersist(drizzle, {
      context: courseContext,
      tool,
    });
    const { accessToken } = await getToolAndItsOidcAccessToken(app, tool);
    const timestamp = new Date();

    await request(app.getHttpServer())
      .post(Routes.lti.ags.scores.publish(courseContext.id, lineItem.id.toString()))
      .set("content-type", LtiAdvantageMediaType.Score)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        activityProgress: LtiScore.ActivityProgress.Initialized,
        gradingProgress: LtiScore.GradingProgress.NotReady,
        userId: student.getUser().getId().toString(),
        timestamp: timestamp.toISOString(),
      } satisfies ClassProperties<ScoreDTO>)
      .expect(404);

    const scoresInDb = await drizzle.getClient().query.ltiScoresT.findMany();
    expect(scoresInDb).toHaveLength(0);
  });
});
