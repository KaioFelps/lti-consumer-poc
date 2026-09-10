/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createMinimalLineItem } from "ltilib/tests/common/factories/line-item.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryLtiScoresRepository } from "ltilib/tests/common/in-memory-repositories/scores-repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { InvalidContentTypeError } from "$/advantage/errors/invalid-content-type.error";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import {
  InvalidScoreArgumentError,
  MissingPlatformAgsConfigurationError,
} from "$/assignment-and-grade/errors";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { InvalidArgumentError } from "$/core/errors/bases/invalid-argument.error";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { LtiScoreServices } from ".";

describe("[AGS] Publish Score Service", async () => {
  let platform: Platform;

  let scoresRepo: InMemoryLtiScoresRepository;
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  let sut: LtiScoreServices;

  beforeEach(async () => {
    platform = await createPlatform();
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
    scoresRepo = new InMemoryLtiScoresRepository();

    await recreateSutWithPlatform(platform);
  });

  async function recreateSutWithPlatform(platform: Platform) {
    sut = new LtiScoreServices(platform, scoresRepo, deploymentsRepo);
  }

  const getValidCompleteLineItemUpdateArgs = () => {
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Score] });
    const context = createContext();
    const deployment = createToolDeployment({ context, tool });
    const lineItem = createMinimalLineItem();

    deploymentsRepo.deployments.push(deployment);

    return { tool, context, deployment, lineItem };
  };

  const getPublishLineItemParams = (
    context: Context,
    tool: LtiTool,
    lineItem: LtiLineItem,
    userId: string,
  ) =>
    ({
      acceptHeader: undefined,
      contentTypeHeader: LtiAdvantageMediaType.Score,
      context,
      tool,
      lineItemId: lineItem.id,
      activityProgress: LtiScore.ActivityProgress.InProgress,
      gradingProgress: LtiScore.GradingProgress.NotReady,
      scoreGiven: 10,
      scoreMaximum: 10,
      scoringUserId: undefined,
      timestamp: new Date(),
      userId,
      submission: undefined,
    }) satisfies Parameters<typeof sut.publish>[0];

  test("successful update response contracts", async () => {
    const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

    const userId = generateUUID();
    const response = await sut.publish(getPublishLineItemParams(context, tool, lineItem, userId));

    assert(e.isRight(response));
    expect(response.right.content).toBeUndefined();
    expect(response.right.rawContent).toBeUndefined();
    expect(response.right.httpStatusCode).toBe(204);
  });

  it.skip("should update an existing score", async () => {});

  it.skip("should refuse to update a score if the incoming timestamp is older than the current", async () => {});

  it.skip("should persist valid custom parameters", async () => {
    const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

    const response = await sut.publish({
      ...getPublishLineItemParams(context, tool, lineItem, generateUUID()),
      customParameters: {
        "invalid-key": true,
        "https://my-domain.com/valid-key": {
          foo: true,
          bar: false,
        },
      },
    });

    assert(e.isRight(response));

    const score = scoresRepo.scores[0].score;
    expect(score).not.toHaveProperty("invalid-key");
    expect(score).toEqual(
      expect.objectContaining({
        "https://my-domain.com/valid-key": {
          foo: true,
          bar: false,
        },
      }),
    );
  });

  it("should require `score` (write) scope", async () => {
    const SCOPES_CASES = {
      "no scopes are sent": [] as string[],
      "all the other scopes are sent": [
        AssignmentAndGradeServiceScopes.LineitemReadonly.toString(),
        AssignmentAndGradeServiceScopes.Lineitem.toString(),
        AssignmentAndGradeServiceScopes.ResultReadonly.toString(),
      ],
    };

    const context = createContext();
    const lineItem = createMinimalLineItem();

    for (const [when, scopes] of Object.entries(SCOPES_CASES)) {
      const tool = createTool({ scopes });

      const response = await sut.publish(
        getPublishLineItemParams(context, tool, lineItem, generateUUID()),
      );

      assert(e.isLeft(response), `should not publish a scope item when ${when}`);

      const error = response.left;
      expect(error).toBeInstanceOf(MissingScopeError);
    }
  });

  it("should require score media type", async () => {
    const context = createContext();
    const lineItem = createMinimalLineItem();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Score] });

    const INVALID_MEDIA_TYPES_CASES = [
      "",
      "application/json",
      LtiAdvantageMediaType.LineItemContainer,
      LtiAdvantageMediaType.LineItem,
    ];

    for (const mediaType of INVALID_MEDIA_TYPES_CASES) {
      const response = await sut.publish({
        ...getPublishLineItemParams(context, tool, lineItem, generateUUID()),
        contentTypeHeader: mediaType,
      });

      assert(
        e.isLeft(response),
        "should not publish a score when `Content-Type` header value is not the score schema " +
          `but succeeded with "${mediaType} media type."`,
      );
      expect(response.left).toBeInstanceOf(InvalidContentTypeError);
    }
  });

  describe("constraints violations", async () => {
    const cases = [
      { scoreMaximum: 0 },
      { scoreGiven: -1 },
      { submission: { submittedAt: new Date(Date.now()), startedAt: new Date(Date.now() + 1000) } },
    ] as Partial<Parameters<typeof sut.publish>[0]>[];

    test.each(cases)("creating a new score", async (overrides) => {
      const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

      const FULL_PAYLOAD = getPublishLineItemParams(context, tool, lineItem, generateUUID());
      const payload = { ...FULL_PAYLOAD, ...overrides };

      const response = await sut.publish(payload);

      assert(e.isLeft(response));
      expect(response.left).toBeInstanceOf(InvalidArgumentError);
      expect(response.left.httpStatusCode).toBe(422);
    });

    test("updating an existing score using an older timestamp should be forbidden", async () => {
      const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();
      const userId = generateUUID();

      const params = getPublishLineItemParams(context, tool, lineItem, userId);
      const score = LtiScore.create({
        ...params,
        score: { given: params.scoreGiven, maximum: params.scoreMaximum },
      });

      assert(e.isRight(score));
      scoresRepo.scores.push({ score: score.right, lineItemId: lineItem.id.toString() });

      const payload = {
        ...getPublishLineItemParams(context, tool, lineItem, userId),
        timestamp: new Date(Date.now() - 10000),
      };

      const response = await sut.publish(payload);

      assert(e.isLeft(response));
      expect(response.left).toBeInstanceOf(InvalidScoreArgumentError);

      const error = response.left as InvalidScoreArgumentError;
      expect(error.field).toBe("timestamp");
      expect(error.reason).toBe("outdated");
    });
  });

  it("should require the platform to have AGS enabled in `Platform` options", async () => {
    const platform = await createPlatform({ agsConfiguration: null });
    assert(platform.agsConfiguration === undefined, "Platform should have no `agsConfiguration`");
    await recreateSutWithPlatform(platform);

    const context = createContext();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ tool, context });
    const lineItem = createMinimalLineItem({ context });
    deploymentsRepo.deployments.push(deployment);

    const response = await sut.publish(
      getPublishLineItemParams(context, tool, lineItem, generateUUID()),
    );

    assert(e.isLeft(response));
    expect(response.left.httpStatusCode).toBe(500);
    expect(response.left).toBeInstanceOf(MissingPlatformAgsConfigurationError);
  });
});
