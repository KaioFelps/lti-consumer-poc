/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 *
 * ---
 *
 * There are no tests regarding `resultMaximum` being a positive number because
 * ltilib extracts results from scores, thus this's been validated by the `LtiScore`
 * constructor. (Unless the client platform has bypassed these validations, of course...)
 */

import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createMinimalLineItem } from "ltilib/tests/common/factories/line-item.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createScore } from "ltilib/tests/common/factories/score.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryLtiScoresRepository } from "ltilib/tests/common/in-memory-repositories/scores-repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { NotAcceptableMediaTypeError } from "$/advantage/errors/not-acceptable-media-type.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { LtiResultServices } from ".";

describe("[AGS] Fetch Results Service", async () => {
  let platform: Platform;
  let scoresRepo: InMemoryLtiScoresRepository;
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  let sut: LtiResultServices;

  beforeEach(async () => {
    platform = await createPlatform();
    scoresRepo = new InMemoryLtiScoresRepository();
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
    sut = new LtiResultServices(platform, scoresRepo, deploymentsRepo);
  });

  function getEntities({
    scopes = [AssignmentAndGradeServiceScopes.ResultReadonly],
  }: {
    scopes?: AssignmentAndGradeServiceScopes[];
  } = {}) {
    const context = createContext();
    const tool = createTool({ scopes });
    const deployment = createToolDeployment({ context, tool });
    const lineItem = createMinimalLineItem({ context });

    deploymentsRepo.deployments.push(deployment);

    return { context, tool, lineItem };
  }

  function getArguments({
    context,
    lineItem,
    tool,
  }: {
    context: Context<never>;
    lineItem: LtiLineItem;
    tool: LtiTool;
  }) {
    return {
      acceptHeader: LtiAdvantageMediaType.ResultContainer,
      contentTypeHeader: undefined,
      context,
      defaultLimit: 100,
      lineItemId: lineItem.id,
      tool,
      filters: { limit: undefined, page: 1, userId: undefined },
    } satisfies Parameters<typeof sut.fetchResults>[0];
  }

  it("should return an empty set of results when there ain't no results to be returned", async () => {
    const result = await sut.fetchResults(getArguments(getEntities()));
    assert(e.isRight(result));
    expect(result.right.content).toHaveLength(0);
    expect(result.right.content).toEqual(expect.arrayContaining([]));
  });

  it("should be possible to filter results by user id", async () => {
    const entities = getEntities();
    const userId = generateUUID();
    const score = createScore({
      activityProgress: LtiScore.ActivityProgress.Completed,
      gradingProgress: LtiScore.GradingProgress.FullyGraded,
      userId,
      score: { given: 1, maximum: 1 },
    });

    scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });

    const unexistingIdResult = await sut.fetchResults({
      ...getArguments(entities),
      filters: {
        userId: "unexisting-user-id",
        page: 1,
        limit: undefined,
      },
    });

    assert(e.isRight(unexistingIdResult));
    expect(unexistingIdResult.right.content).toHaveLength(0);
    expect(unexistingIdResult.right.content).toEqual(expect.arrayContaining([]));

    const existingIdResult = await sut.fetchResults({
      ...getArguments(entities),
      filters: { userId, page: 1, limit: undefined },
    });

    assert(e.isRight(existingIdResult));

    const resultContainer = existingIdResult.right.content;
    expect(resultContainer).toHaveLength(1);

    const result = resultContainer[0];
    expect(result["id"]).toBeInstanceOf(URL);
    expect(result["scoreOf"]).toBeInstanceOf(URL);

    const resultWithUrlAsStrings = {
      ...result,
      id: result.id.toString(),
      scoreOf: result.scoreOf.toString(),
    };

    expect(resultWithUrlAsStrings).toEqual(
      expect.objectContaining({
        id: expect.stringContaining(userId),
        scoreOf: expect.stringContaining(entities.lineItem.id.toString()),
      }),
    );
  });

  describe("pagination", () => {
    // the focus here is to ensure that the repository *can* receive the correct limit and
    // so calculate the results to be returned; of course it's up to the client platform to
    // implement the pagination on their own repositories
    it("should limit the page correctly", async () => {
      const entities = getEntities();

      const totalScores = 50;
      for (let i = 0; i < totalScores; i++) {
        const score = createScore({
          activityProgress: LtiScore.ActivityProgress.Completed,
          gradingProgress: LtiScore.GradingProgress.FullyGraded,
        });

        scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
      }

      const result = await sut.fetchResults({
        ...getArguments(entities),
        filters: { userId: undefined, page: 1, limit: 20 },
      });

      assert(e.isRight(result));
      const linkHeader = result.right.headers.get("Link");
      expect(linkHeader, "should contain the link to the first page").toContain('rel="first"');
      expect(linkHeader, "should contain the link to the last page").toContain('rel="last"');
      expect(linkHeader, "should contain the link to the next page").toContain('rel="next"');
      expect(
        linkHeader,
        "should not contain a link to the previous page since it's the first page itself",
      ).not.toContain('rel="prev"');
    });

    // same thing: we check the repository received the resolved limit
    it("should not allow a limit higher than what allowed by the client platform", async () => {
      const entities = getEntities();

      const totalScores = 50;
      for (let i = 0; i < totalScores; i++) {
        const score = createScore({
          activityProgress: LtiScore.ActivityProgress.Completed,
          gradingProgress: LtiScore.GradingProgress.FullyGraded,
          score: { given: 1, maximum: 1 },
        });

        scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
      }

      const result = await sut.fetchResults({
        ...getArguments(entities),
        filters: { userId: undefined, page: 1, limit: 10000 },
        maxLimit: 20,
      });

      // pagination should have considered 20 as the actual limit both for fetching the scores and for calculating
      // the Link header
      assert(e.isRight(result));
      expect(result.right.content).toHaveLength(20);

      const linkHeader = result.right.headers.get("Link");
      expect(linkHeader, "should contain the link to the first page").toContain('rel="first"');
      expect(linkHeader, "should contain the link to the last page").toContain('rel="last"');
      expect(linkHeader, "should contain the link to the next page").toContain('rel="next"');
      expect(
        linkHeader,
        "should not contain a link to the previous page since it's the first page itself",
      ).not.toContain('rel="prev"');
    });
  });

  // see: https://www.imsglobal.org/spec/lti-ags/v2p0#platform-may-skip-empty-results
  // it's easier to omit every result that has no score, because it keeps consistent with
  // the users that has no actual instance of `LtiScore` related to it at all.

  it("should omit results that has no 'resultScore' even if the repository returns them", async () => {
    // it DOES mix up with pagination...
    const entities = getEntities();

    const totalUnscoredScores = 10;
    const totalCompleteScores = 15;
    for (let i = 0; i < totalUnscoredScores; i++) {
      const score = createScore({
        activityProgress: LtiScore.ActivityProgress.Completed,
        gradingProgress: LtiScore.GradingProgress.PendingManual,
        score: undefined,
      });
      scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
    }
    for (let i = 0; i < totalCompleteScores; i++) {
      const score = createScore({
        activityProgress: LtiScore.ActivityProgress.Completed,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        score: { given: 1, maximum: 1 },
      });
      scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
    }

    const result = await sut.fetchResults({
      ...getArguments(entities),
      filters: { userId: undefined, page: 1, limit: 10000 },
      maxLimit: 20,
    });

    assert(e.isRight(result));
    // it'll be 10 since the max limit is 20 and the first 10 are unscored and thus will be filtered out
    expect(result.right.content.length).toBeLessThan(totalCompleteScores);
    for (const score of result.right.content) {
      expect(score.resultMaximum).toEqual(expect.any(Number));
    }
  });

  it("should require results scope", async () => {
    const entities = getEntities({
      scopes: [
        // every scope but the result one
        AssignmentAndGradeServiceScopes.Lineitem,
        AssignmentAndGradeServiceScopes.LineitemReadonly,
        AssignmentAndGradeServiceScopes.Score,
      ],
    });

    const result = await sut.fetchResults({
      ...getArguments(entities),
      filters: { userId: undefined, page: 1, limit: 10000 },
      maxLimit: 20,
    });

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(MissingScopeError);
    expect((result.left as MissingScopeError).missingScopes).toEqual([
      AssignmentAndGradeServiceScopes.ResultReadonly,
    ]);
  });

  it("should require results container media type on 'accept' HTTP header", async () => {
    const entities = getEntities();

    const result = await sut.fetchResults({
      ...getArguments(entities),
      acceptHeader: "another-content-type-required",
      filters: { userId: undefined, page: 1, limit: 10000 },
      maxLimit: 20,
    });

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(NotAcceptableMediaTypeError);
    expect((result.left as NotAcceptableMediaTypeError).availableMediaType).toEqual(
      LtiAdvantageMediaType.ResultContainer,
    );
  });

  it("should suggest results container media type for 'content-type' HTTP header", async () => {
    const entities = getEntities();
    const result = await sut.fetchResults(getArguments(entities));
    assert(e.isRight(result));
    expect(result.right.headers.get("content-type")).toBe(LtiAdvantageMediaType.ResultContainer);
  });

  it("should paginate the results by 'page' parameter", async () => {
    const TOTAL_SCORED_SCORES = 50;
    const entities = getEntities();

    for (let i = 0; i < TOTAL_SCORED_SCORES; i++) {
      const score = createScore({
        activityProgress: LtiScore.ActivityProgress.Completed,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        score: { given: 1, maximum: 1 },
      });
      scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
    }

    const result = await sut.fetchResults({
      ...getArguments(entities),
      filters: { userId: undefined, page: 2, limit: 30 },
    });

    assert(e.isRight(result));
    expect(result.right.content).toHaveLength(TOTAL_SCORED_SCORES - 30);

    const linkHeader = result.right.headers.get("link");
    assert(linkHeader);
    expect(linkHeader).toContain('rel="first"');
    expect(linkHeader).toContain('rel="last"');
    expect(linkHeader).toContain('rel="prev"');
    expect(linkHeader).not.toContain('rel="next"');
  });

  describe("HTTP Link header", () => {
    const TOTAL_SCORED_SCORES = 50;
    let entities: ReturnType<typeof getEntities>;

    beforeEach(async () => {
      entities = getEntities();

      for (let i = 0; i < TOTAL_SCORED_SCORES; i++) {
        const score = createScore({
          activityProgress: LtiScore.ActivityProgress.Completed,
          gradingProgress: LtiScore.GradingProgress.FullyGraded,
          score: { given: 1, maximum: 1 },
        });
        scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });
      }
    });

    it("should indicate there is a next page", async () => {
      const result = await sut.fetchResults({
        ...getArguments(entities),
        filters: { page: 1, limit: 25, userId: undefined },
      });

      assert(e.isRight(result));
      const linkHeader = result.right.headers.get("link")!;
      expect(linkHeader).toContain('rel="next"');
      expect(linkHeader).not.toContain('rel="prev"');
    });

    it("should indicate there is a previous page", async () => {
      const result = await sut.fetchResults({
        ...getArguments(entities),
        filters: { page: 2, limit: 25, userId: undefined },
      });

      assert(e.isRight(result));
      const linkHeader = result.right.headers.get("link")!;
      expect(linkHeader).not.toContain('rel="next"');
      expect(linkHeader).toContain('rel="prev"');
    });

    it("should indicate what are the first and the last pages", async () => {
      const result = await sut.fetchResults(getArguments(entities));
      assert(e.isRight(result));

      const linkHeader = result.right.headers.get("link")!;
      expect(linkHeader).toContain('rel="first"');
      expect(linkHeader).toContain('rel="last"');
    });
  });

  it("should suggest a 200 HTTP status code", async () => {
    const result = await sut.fetchResults(getArguments(getEntities()));
    assert(e.isRight(result));
    expect(result.right.httpStatusCode).toBe(200);
  });

  it.each(["scoreOf", "id"])("$0 should be a fully qualified URL", async (property) => {
    const entities = getEntities();
    const score = createScore({
      activityProgress: LtiScore.ActivityProgress.Completed,
      gradingProgress: LtiScore.GradingProgress.FullyGraded,
      score: { given: 1, maximum: 1 },
    });
    scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });

    const result = await sut.fetchResults(getArguments(entities));
    assert(e.isRight(result));
    expect(result.right.content[0][property]).toBeInstanceOf(URL);
  });

  // see: https://www.imsglobal.org/spec/lti-ags/v2p0#resultmaximum
  test("'resultMaximum' defaults to 1", async () => {
    const entities = getEntities();
    let score = createScore({
      activityProgress: LtiScore.ActivityProgress.Completed,
      gradingProgress: LtiScore.GradingProgress.FullyGraded,
    });
    score = LtiScore.createUnchecked({
      ...score,
      score: { given: 2, maximum: undefined as unknown as number },
    });
    scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });

    const result = await sut.fetchResults(getArguments(entities));
    assert(e.isRight(result));
    expect(result.right.content[0].resultMaximum).toBe(1);
  });

  it("should present custom parameters", async () => {
    const entities = getEntities();
    const score = createScore({
      activityProgress: LtiScore.ActivityProgress.Completed,
      gradingProgress: LtiScore.GradingProgress.FullyGraded,
      score: { given: 2, maximum: 1 },
      customParameters: {
        "https://example.com/custom-property": { shouldSaveIt: true },
      },
    });
    scoresRepo.scores.push({ lineItemId: entities.lineItem.id.toString(), score });

    const result = await sut.fetchResults(getArguments(entities));
    assert(e.isRight(result));
    expect(result.right.content[0]["https://example.com/custom-property"]).toEqual({
      shouldSaveIt: true,
    });
  });
});
