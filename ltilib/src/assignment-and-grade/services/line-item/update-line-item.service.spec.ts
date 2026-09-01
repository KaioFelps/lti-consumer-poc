/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
import { createMinimalLineItem } from "ltilib/tests/common/factories/line-item.factory";
import {
  createPlatform,
  createPlatformAgsConfiguration,
} from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryExternalLtiResourcesRepository } from "ltilib/tests/common/in-memory-repositories/external-lti-resources.repository";
import { InMemoryLtiLineItemsRepository } from "ltilib/tests/common/in-memory-repositories/line-items.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { InMemoryToolsRepository } from "ltilib/tests/common/in-memory-repositories/tools.repository";
import { InvalidContentTypeError } from "$/advantage/errors/invalid-content-type.error";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { InaccessibleLineItemError } from "$/assignment-and-grade/errors/inaccessible-line-item.error";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors/missing-platform-ags-configuration.error";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { PresentedLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { Context } from "$/core/context";
import { InvalidArgumentError } from "$/core/errors/bases/invalid-argument.error";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { LtiToolDeployment } from "$/core/tool-deployment";

describe("[AGS] Update Line Item Service", async () => {
  let platform: Platform;
  let ltiResourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let externalLtiResourcesRepo: InMemoryExternalLtiResourcesRepository;
  let toolsRepository: InMemoryToolsRepository;
  let lineItemsRepo: InMemoryLtiLineItemsRepository;
  let toolDeploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  let sut: LtiLineItemServices;

  beforeEach(async () => {
    platform = await createPlatform();
    ltiResourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    toolDeploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
    externalLtiResourcesRepo = new InMemoryExternalLtiResourcesRepository();
    toolsRepository = externalLtiResourcesRepo.toolsRepository;
    lineItemsRepo = new InMemoryLtiLineItemsRepository();

    await recreateSutWithPlatform(platform);
  });

  async function recreateSutWithPlatform(platform: Platform) {
    sut = new LtiLineItemServices(
      platform,
      ltiResourceLinksRepo,
      externalLtiResourcesRepo,
      lineItemsRepo,
      toolDeploymentsRepo,
    );
  }

  const getValidCompleteLineItemUpdateArgs = () => {
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const context = createContext();
    const resourceLink = createResourceLink({ tool, contextId: context.id });
    const resource = createExternalLtiResource({
      tool,
      context,
      externalToolResourceId: "quiz-231",
    });
    const deployment = createToolDeployment({ context, tool });
    const lineItem = createMinimalLineItem();

    toolsRepository.tools.push(tool);
    lineItemsRepo.lineItems.push({ lineItem, owningTool: tool });
    toolDeploymentsRepo.deployments.push(deployment);
    externalLtiResourcesRepo.externalLtiResources.push(resource);
    ltiResourceLinksRepo.resourceLinks.push(resourceLink);

    return { tool, context, resourceLink, resource, deployment, lineItem };
  };

  const getUpdateLineItemParams = (context: Context, tool: LtiTool, lineItem: LtiLineItem) =>
    ({
      acceptHeader: undefined,
      contentTypeHeader: LtiAdvantageMediaType.LineItem,
      context,
      tool,
      label: lineItem.label,
      scoreMaximum: lineItem.scoreMaximum,
      lineItemId: lineItem.id,
      customParameters: lineItem.customParameters,
      endDateTime: lineItem.endDateTime,
      gradesReleased: lineItem.gradesReleased,
      resourceId: lineItem.externalResource?.externalToolResourceId,
      startDateTime: lineItem.startDateTime,
      tag: lineItem.tag,
    }) satisfies Parameters<typeof sut.update>[0];

  test("successful update response contracts", async () => {
    const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

    const response = await sut.update(getUpdateLineItemParams(context, tool, lineItem));

    assert(e.isRight(response));
    const presentedLineItem = response.right.content;

    expect(presentedLineItem).toEqual(
      expect.objectContaining({
        id: expect.stringContaining(lineItem.id.toString()),
        label: lineItem.label,
        scoreMaximum: lineItem.scoreMaximum,
        endDateTime: lineItem.endDateTime?.toISOString(),
        startDateTime: lineItem.startDateTime?.toISOString(),
        gradesReleased: lineItem.gradesReleased,
        resourceId: lineItem.externalResource?.externalToolResourceId,
        resourceLinkId: lineItem.resourceLink?.id,
        tag: lineItem.tag,
      } satisfies PresentedLtiLineItem),
    );
    expect(
      () => new URL(presentedLineItem["id"]),
      "id should be the line item fully-qualified URL",
    ).not.toThrow();
    expect(response.right.httpStatusCode, "should enforce 201 HTTP status code").toBe(201);
    expect(
      response.right.headers.get("Content-Type"),
      "it should contain the correct content-type header",
    ).toBe(LtiAdvantageMediaType.LineItem);
  });

  it("should persist valid custom parameters", async () => {
    const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

    const response = await sut.update({
      ...getUpdateLineItemParams(context, tool, lineItem),
      customParameters: {
        "invalid-key": true,
        "https://my-domain.com/valid-key": {
          foo: true,
          bar: false,
        },
      },
    });

    assert(e.isRight(response));
    const presentedLineItem = response.right.content;
    expect(presentedLineItem).not.toHaveProperty("invalid-key");
    expect(presentedLineItem).toEqual(
      expect.objectContaining({
        "https://my-domain.com/valid-key": {
          foo: true,
          bar: false,
        },
      }),
    );
  });

  it("should require `lineitems` (write) scope", async () => {
    const SCOPES_CASES = {
      "no scopes are sent": [] as string[],
      "only readonly scope is sent": [AssignmentAndGradeServiceScopes.LineitemReadonly.toString()],
    };

    const context = createContext();
    const lineItem = createMinimalLineItem();

    for (const [when, scopes] of Object.entries(SCOPES_CASES)) {
      const tool = createTool({ scopes });

      const response = await sut.update(getUpdateLineItemParams(context, tool, lineItem));

      assert(e.isLeft(response), `should not edit a line item when ${when}`);

      const error = response.left;
      expect(error).toBeInstanceOf(MissingScopeError);
    }
  });

  it("should treat repository's NotFound errors as inaccessible line items", async () => {
    const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

    // clearing the repo so it doesn't find the line item
    lineItemsRepo.lineItems = [];
    let response = await sut.update(getUpdateLineItemParams(context, tool, lineItem));
    assert(e.isLeft(response));
    expect(response.left).toBeInstanceOf(InaccessibleLineItemError);

    // testing with unauthorized tool
    const unauthorizedTool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });

    lineItemsRepo.lineItems.push({ lineItem, owningTool: tool });
    toolsRepository.tools.push(unauthorizedTool);
    toolDeploymentsRepo.deployments.push(
      LtiToolDeployment.create({
        id: generateUUID(),
        toolId: unauthorizedTool.id,
        contextId: context.id,
      }),
    );

    response = await sut.update(getUpdateLineItemParams(context, unauthorizedTool, lineItem));
    assert(e.isLeft(response));
    expect(response.left).toBeInstanceOf(InaccessibleLineItemError);
  });

  it("should require line item media type", async () => {
    const context = createContext();
    const lineItem = createMinimalLineItem();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });

    const INVALID_MEDIA_TYPES_CASES = [
      "",
      "application/json",
      LtiAdvantageMediaType.LineItemContainer,
    ];

    for (const mediaType of INVALID_MEDIA_TYPES_CASES) {
      const response = await sut.update({
        ...getUpdateLineItemParams(context, tool, lineItem),
        contentTypeHeader: mediaType,
      });

      assert(
        e.isLeft(response),
        "should not update a line item when `Content-Type` header value is not the line item schema " +
          `but succeeded with "${mediaType} media type."`,
      );
      expect(response.left).toBeInstanceOf(InvalidContentTypeError);
    }
  });

  it("should ignore changes related to id or resource link", async () => {
    const { lineItem, tool, context } = getValidCompleteLineItemUpdateArgs();
    const resourceLink = createResourceLink();
    ltiResourceLinksRepo.resourceLinks.push(resourceLink);

    const id = generateUUID();

    const response = await sut.update({
      ...getUpdateLineItemParams(context, tool, lineItem),
      ...{ id, resourceLinkId: resourceLink.id },
    });

    assert(e.isRight(response));
    expect(response.right.content["id"]).not.toBe(id);
    expect(response.right.content["resourceLinkId"]).toBe(lineItem.resourceLink?.id);

    const { lineItem: persistedLineItem } = lineItemsRepo.lineItems.find(
      (item) => item.lineItem.id === lineItem.id,
    )!;
    expect(persistedLineItem.id).not.toBe(id);
    expect(persistedLineItem.resourceLink?.id).toBe(lineItem.resourceLink?.id);
  });

  it("should omit start and end datetimes if not supported", async () => {
    const { tool, context } = getValidCompleteLineItemUpdateArgs();
    const platform = await createPlatform({
      agsConfiguration: createPlatformAgsConfiguration({
        deadlinesEnabled: { end: false, start: false },
      }),
    });

    await recreateSutWithPlatform(platform);

    const lineItem = createMinimalLineItem({ startDateTime: undefined, endDateTime: undefined });
    lineItemsRepo.lineItems.push({ lineItem, owningTool: tool });

    const response = await sut.update({
      ...getUpdateLineItemParams(context, tool, lineItem),
      startDateTime: new Date("2018-03-06T20:05:02Z"),
      endDateTime: new Date("2018-04-06T22:05:03Z"),
    });

    assert(e.isRight(response));

    const presentedResult = response.right.content;
    const reobjectifiedResult = JSON.parse(JSON.stringify(presentedResult)) as object;

    expect(reobjectifiedResult).not.toHaveProperty("startDateTime");
    expect(reobjectifiedResult).not.toHaveProperty("endDateTime");
  });

  describe("[3.2.10] `resourceId`", () => {
    it("should consider blank strings as if the field was omitted", async () => {
      const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

      const response = await sut.update({
        ...getUpdateLineItemParams(context, tool, lineItem),
        resourceId: "",
      });

      assert(e.isRight(response));
      expect(lineItemsRepo.lineItems[0].lineItem.resourceLink).toBeUndefined();
    });

    it("should consider `null` as if the field was omitted", async () => {
      const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

      const response = await sut.update({
        ...getUpdateLineItemParams(context, tool, lineItem),
        resourceId: null as unknown as undefined,
      });

      assert(e.isRight(response));
      expect(lineItemsRepo.lineItems[0].lineItem.resourceLink).toBeUndefined();
    });

    it(
      "should create a new external resource (in current context and for current tool) if " +
        "present but yet unexisting",
      async () => {
        const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

        const params = getUpdateLineItemParams(context, tool, lineItem);
        const response = await sut.update({ ...params, resourceId: "test-resource-id" });

        assert(e.isRight(response));
        expect(externalLtiResourcesRepo.externalLtiResources).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ externalToolResourceId: "test-resource-id" }),
          ]),
        );
      },
    );
  });

  it(
    "should respond with an error suggesting the platform to return a BAD_REQUEST response when there are " +
      "violations to specification's constraints over payload",
    async () => {
      const { context, tool, lineItem } = getValidCompleteLineItemUpdateArgs();

      const FULL_PAYLOAD = getUpdateLineItemParams(context, tool, lineItem);

      const INVALID_PARTIAL_PAYLOADS = [
        { ...FULL_PAYLOAD, scoreMaximum: 0 },
        { ...FULL_PAYLOAD, scoreMaximum: -1 },
        { ...FULL_PAYLOAD, label: "" },
      ];

      for (const payload of INVALID_PARTIAL_PAYLOADS) {
        const response = await sut.update(payload);

        assert(e.isLeft(response));
        expect(response.left).toBeInstanceOf(InvalidArgumentError);
        expect(response.left.httpStatusCode).toBe(422);
      }
    },
  );

  it("should require the platform to have AGS enabled in `Platform` options", async () => {
    const platform = await createPlatform({ agsConfiguration: null });
    assert(platform.agsConfiguration === undefined, "Platform should have no `agsConfiguration`");
    await recreateSutWithPlatform(platform);

    const context = createContext();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ tool, context });
    const lineItem = createMinimalLineItem({ context });
    toolDeploymentsRepo.deployments.push(deployment);
    lineItemsRepo.lineItems.push({ lineItem, owningTool: tool });

    const response = await sut.update(getUpdateLineItemParams(context, tool, lineItem));

    assert(e.isLeft(response));
    expect(response.left.httpStatusCode).toBe(500);
    expect(response.left).toBeInstanceOf(MissingPlatformAgsConfigurationError);
  });
});
