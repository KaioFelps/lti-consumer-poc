/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
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
import { InvalidMediaTypeError } from "$/advantage/errors/invalid-media-type.error";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { CannotAttachResourceLinkError } from "$/assignment-and-grade/errors/cannot-attach-resource-link.error";
import { MissingPlatformAgsConfiguration } from "$/assignment-and-grade/errors/missing-platform-ags-configuration.error";
import { ToolIsNotDeployedInContextError } from "$/assignment-and-grade/errors/tool-is-not-deployed-in-context.error";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item.services";
import { InvalidArgumentError } from "$/core/errors/invalid-argument.error";
import { Platform } from "$/core/platform";

describe("[AGS] Create Line Item Service", async () => {
  let platform: Platform;
  let ltiResourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let externalLtiResourcesRepo: InMemoryExternalLtiResourcesRepository;
  let lineItemsRepo: InMemoryLtiLineItemsRepository;
  let toolDeploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  let sut: LtiLineItemServices;

  beforeEach(async () => {
    platform = await createPlatform();
    ltiResourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    externalLtiResourcesRepo = new InMemoryExternalLtiResourcesRepository();
    lineItemsRepo = new InMemoryLtiLineItemsRepository();
    toolDeploymentsRepo = new InMemoryLtiToolDeploymentsRepository();

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

  const getValidCompleteLineItemCreationArgs = () => {
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const context = createContext();
    const resourceLink = createResourceLink({ tool, contextId: context.id });
    const resource = createExternalLtiResource({
      tool,
      context,
      externalToolResourceId: "quiz-231",
    });
    const deployment = createToolDeployment({ context, tool });

    toolDeploymentsRepo.deployments.push(deployment);
    externalLtiResourcesRepo.externalLtiResources.push(resource);
    ltiResourceLinksRepo.resourceLinks.push(resourceLink);

    return { tool, context, resourceLink, resource, deployment };
  };

  describe("Successful Creation's Result", () => {
    it("should create a line item", async () => {
      expect(lineItemsRepo.lineItems.length).toBe(0);

      const { context, resource, resourceLink, tool } = getValidCompleteLineItemCreationArgs();

      const response = await sut.createLineItem({
        tool,
        context,
        resourceLinkId: resourceLink.id,
        acceptHeader: LtiAdvantageMediaType.LineItem,
        scoreMaximum: 60,
        label: "Chapter 5 Test",
        resourceId: resource.externalToolResourceId,
        tag: "grade",
        startDateTime: new Date("2018-03-06T20:05:02Z"),
        endDateTime: new Date("2018-04-06T22:05:03Z"),
      });

      assert(e.isRight(response), "Should create line item successfully");
      expect(lineItemsRepo.lineItems.length).toBe(1);
    });

    test("line item creation response should enforce 201 HTTP status code", async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        scoreMaximum: 100,
        tool,
        label: faker.lorem.sentence(),
      });

      assert(e.isRight(response));
      expect(response.right.httpStatusCode).toBe(201);
    });

    test("line item creation response contains the newly created line item", async () => {
      const { context, resource, resourceLink, tool } = getValidCompleteLineItemCreationArgs();

      const response = await sut.createLineItem({
        tool,
        context,
        resourceLinkId: resourceLink.id,
        acceptHeader: LtiAdvantageMediaType.LineItem,
        scoreMaximum: 60,
        label: "Chapter 5 Test",
        resourceId: "quiz-231",
        tag: "grade",
        startDateTime: new Date("2018-03-06T20:05:02Z"),
        endDateTime: new Date("2018-04-06T22:05:03Z"),
      });

      assert(e.isRight(response), "Should create line item successfully");

      const lineItem = response.right.content;
      const storedLineItems = await lineItemsRepo.findByExternalResourceAndTag(
        resource.externalToolResourceId,
        "grade",
      );

      assert(e.isRight(storedLineItems));
      assert(lineItem.id.includes(storedLineItems.right.id.toString()));
      assert(lineItem.label === storedLineItems.right.label);
      assert(lineItem.tag === storedLineItems.right.tag);
      assert(lineItem.scoreMaximum === storedLineItems.right.scoreMaximum);
      assert(lineItem.gradesReleased === storedLineItems.right.gradesReleased);
      assert(lineItem.startDateTime === storedLineItems.right.startDateTime);
      assert(lineItem.endDateTime === storedLineItems.right.endDateTime);
      assert(
        lineItem.resourceId === storedLineItems.right.externalResource?.externalToolResourceId,
      );
    });

    test("line item creation response contains the correct line item media type", async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        scoreMaximum: 100,
        tool,
        label: faker.lorem.sentence(),
      });

      assert(e.isRight(response));
      expect(response.right.headers["Content-Type"]).toBe(LtiAdvantageMediaType.LineItem);
    });

    it("should contain the newly created line item's ID", async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        scoreMaximum: 100,
        tool,
        label: faker.lorem.sentence(),
      });

      assert(e.isRight(response));
      assert(typeof response.right.content.id === "string");
      expect(response.right.content.id.length).toBeGreaterThan(0);
    });
  });

  it("should require `lineitems` (write) scope", async () => {
    const SCOPES_CASES = {
      "no scopes are sent": [] as string[],
      "only readonly scope is sent": [AssignmentAndGradeServiceScopes.LineitemReadonly.toString()],
    };

    for (const [when, scopes] of Object.entries(SCOPES_CASES)) {
      const context = createContext();
      const tool = createTool({ scopes });

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        tool,
      });

      assert(e.isLeft(response), `Should not create a line item when ${when}`);

      const error = response.left;
      expect(error).toBeInstanceOf(MissingScopeError);
    }
  });

  it("should require line item media type", async () => {
    const context = createContext();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });

    const INVALID_MEDIA_TYPES_CASES = [
      "",
      "application/json",
      LtiAdvantageMediaType.LineItemContainer,
    ];

    for (const mediaType of INVALID_MEDIA_TYPES_CASES) {
      const response = await sut.createLineItem({
        acceptHeader: mediaType,
        context,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        tool,
      });

      assert(
        e.isLeft(response),
        "Should not create a line item when `Accept` header value is not the line item schema " +
          `but succeeded with "${mediaType} media type."`,
      );

      const error = response.left;
      expect(error).toBeInstanceOf(InvalidMediaTypeError);
    }
  });

  it("should ignore `id` field upon line item creation", async () => {
    const { context, tool } = getValidCompleteLineItemCreationArgs();

    const id = generateUUID();

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      scoreMaximum: 100,
      tool,
      label: faker.lorem.sentence(),
      // @ts-expect-error inserting the ID is not even allowed by typescript, but let's force it for tests purposes
      id,
    });

    assert(e.isRight(response));
    expect(response.right.content.id).not.toEqual(id);
  });

  it("should omit start and end datetimes if not supported", async () => {
    const { tool, context } = getValidCompleteLineItemCreationArgs();
    const platform = await createPlatform({
      agsConfiguration: createPlatformAgsConfiguration({
        deadlinesEnabled: { end: false, start: false },
      }),
    });

    await recreateSutWithPlatform(platform);

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      label: faker.lorem.sentence(),
      scoreMaximum: 100,
      tool,
      startDateTime: new Date("2018-03-06T20:05:02Z"),
      endDateTime: new Date("2018-04-06T22:05:03Z"),
    });

    assert(e.isRight(response));

    const presentedResult = response.right.content;
    const reobjectifiedResult = JSON.parse(JSON.stringify(presentedResult)) as object;

    expect(reobjectifiedResult).not.toHaveProperty("startDateTime");
    expect(reobjectifiedResult).not.toHaveProperty("endDateTime");
  });

  it("should include start and end datetimes (even if they're unset) when the feature is supported", async () => {
    const { tool, context } = getValidCompleteLineItemCreationArgs();

    const platform = await createPlatform({
      agsConfiguration: createPlatformAgsConfiguration({
        deadlinesEnabled: { end: true, start: true },
      }),
    });

    await recreateSutWithPlatform(platform);

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      label: faker.lorem.sentence(),
      scoreMaximum: 100,
      tool,
    });

    assert(e.isRight(response));

    const presentedResult = response.right.content;
    const reobjectifiedResult = JSON.parse(JSON.stringify(presentedResult)) as object;

    expect(reobjectifiedResult["startDateTime"]).toBeOneOf(["", null]);
    expect(reobjectifiedResult["endDateTime"]).toBeOneOf(["", null]);
  });

  it("should never modify `resourceId` nor `tag` values", async () => {
    const CASES = [
      [createExternalLtiResource(), undefined],
      [createExternalLtiResource(), "grade"],
    ] as const;

    for (const [resource, tag] of CASES) {
      const { tool, context } = getValidCompleteLineItemCreationArgs();

      resource.tool = tool;
      externalLtiResourcesRepo.externalLtiResources.push(resource);

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        resourceId: resource.externalToolResourceId,
        tag,
      });

      assert(e.isRight(response));
      const lineitem = response.right.rawContent;

      expect(lineitem.tag).toBe(tag);
      expect(lineitem.externalResource).toEqual(resource);
    }
  });

  it("should create a line item associated to a resource link if `resourceLinkId` property is present", async () => {
    const { context, tool, resourceLink } = getValidCompleteLineItemCreationArgs();

    ltiResourceLinksRepo.resourceLinks.push(resourceLink);

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      tool,
      resourceLinkId: resourceLink.id,
      label: faker.lorem.sentence(),
      scoreMaximum: 60,
    });

    assert(e.isRight(response));
    const persistedLineItem = lineItemsRepo.lineItems[0];
    assert(!!persistedLineItem.resourceLink);
    expect(persistedLineItem.resourceLink).toEqual(resourceLink);
  });

  it("should not create the line item if the mentioned resource link doesn't belong to the same context as the line item itself", async () => {
    const { context, deployment, tool } = getValidCompleteLineItemCreationArgs();
    const resourceLinkWithUnrelatedContext = createResourceLink({
      tool,
      deploymentId: deployment.id,
    });
    ltiResourceLinksRepo.resourceLinks.push(resourceLinkWithUnrelatedContext);

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      tool,
      resourceLinkId: resourceLinkWithUnrelatedContext.id,
      label: faker.lorem.sentence(),
      scoreMaximum: 100,
    });

    assert(e.isLeft(response));
    expect(response.left).toBeInstanceOf(CannotAttachResourceLinkError);
  });

  describe("Requests to create line items should be responded with not found error when resource link to be bound", () => {
    test("does not exist", async () => {
      const { tool, context } = getValidCompleteLineItemCreationArgs();
      const nonPersistedResourceLink = createResourceLink({ tool, contextId: context.id });

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        resourceLinkId: nonPersistedResourceLink.id,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
      });

      assert(e.isLeft(response));
      expect(response.left).toBeInstanceOf(CannotAttachResourceLinkError);
      expect(response.left.httpStatusCode).toBe(404);
    });

    test("does not belong to the same tool which is trying to create the line item", async () => {
      const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
      const {
        context,
        resourceLink: differentToolsResourceLink,
        tool: _originalOwningTool,
      } = getValidCompleteLineItemCreationArgs();
      const deployment = createToolDeployment({ context, tool });
      toolDeploymentsRepo.deployments.push(deployment);

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        resourceLinkId: differentToolsResourceLink.id,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
      });

      assert(e.isLeft(response));
      expect(response.left.httpStatusCode).toBe(404);
      expect(response.left).toBeInstanceOf(CannotAttachResourceLinkError);
    });
  });

  it(
    "should respond with an error suggesting the platform to return a BAD_REQUEST response when there are " +
      "violations to specification's constraints over payload",
    async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const FULL_PAYLOAD = {
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        scoreMaximum: 100,
        label: faker.lorem.sentence(),
      };

      const INVALID_PARTIAL_PAYLOADS = [
        { ...FULL_PAYLOAD, scoreMaximum: 0 },
        { ...FULL_PAYLOAD, scoreMaximum: -1 },
        { ...FULL_PAYLOAD, label: "" },
      ];

      for (const payload of INVALID_PARTIAL_PAYLOADS) {
        const response = await sut.createLineItem(payload);

        assert(e.isLeft(response));
        expect(response.left).toBeInstanceOf(InvalidArgumentError);
        expect(response.left.httpStatusCode).toBe(422);
      }
    },
  );

  it(
    "should not create a new line item with same `resourceId` and `tag` than another line item belonging " +
      "to a tool, but return the existing one instead",
    async () => {
      expect(lineItemsRepo.lineItems.length).toBe(0);

      const { context, tool, resource } = getValidCompleteLineItemCreationArgs();

      const payload = {
        tool,
        context,
        acceptHeader: LtiAdvantageMediaType.LineItem,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        resourceId: resource.externalToolResourceId,
      } satisfies Parameters<typeof sut.createLineItem>[0];

      let response = await sut.createLineItem(payload);

      assert(e.isRight(response));
      expect(lineItemsRepo.lineItems.length).toBe(1);

      response = await sut.createLineItem(payload);
      assert(e.isRight(response));
      expect(
        lineItemsRepo.lineItems.length,
        "It should not have created another line item when there is already one with same `resourceId` and `tag`",
      ).toBe(1);
    },
  );

  it("should require the tool to be deployed in the same context as the line item being created", async () => {
    const context = createContext();
    const toolWithNoDeployment = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const toolDeployedInAnotherContext = createTool({
      scopes: [AssignmentAndGradeServiceScopes.Lineitem],
    });
    const deployment = createToolDeployment({ tool: toolDeployedInAnotherContext });
    toolDeploymentsRepo.deployments.push(deployment);

    for (const tool of [toolWithNoDeployment, toolDeployedInAnotherContext]) {
      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
      });

      assert(e.isLeft(response));
      expect(response.left.httpStatusCode).toBe(403);
      expect(response.left).toBeInstanceOf(ToolIsNotDeployedInContextError);
    }
  });

  it("should require the platform to have AGS enabled in `Platform` options", async () => {
    const platform = await createPlatform({ agsConfiguration: null });
    assert(platform.agsConfiguration === undefined, "Platform should have no `agsConfiguration`");
    await recreateSutWithPlatform(platform);

    const context = createContext();
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ tool });
    toolDeploymentsRepo.deployments.push(deployment);

    const response = await sut.createLineItem({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      tool,
      label: faker.lorem.sentence(),
      scoreMaximum: 100,
    });

    assert(e.isLeft(response));
    expect(response.left.httpStatusCode).toBe(500);
    expect(response.left).toBeInstanceOf(MissingPlatformAgsConfiguration);
  });

  describe("[3.1.2] Extensions", () => {
    it("should allow custom parameters as per specification", async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const customParamKey = "https://www.toolexample.com/lti/score";
      const customParamValue = {
        originality: 94,
        submissionUrl: "https://www.toolexample.com/lti/score/54/5893/essay.pdf",
      };

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        customParameters: {
          [customParamKey]: customParamValue,
        },
      });

      assert(e.isRight(response));
      expect(response.right.httpStatusCode).toBe(201);

      const persistedLineItem = lineItemsRepo.lineItems[0];

      expect(persistedLineItem.customParameters[customParamKey]).toMatchObject(customParamValue);
    });

    it("should ignore custom parameters which keys are not fully qualified URLs", async () => {
      const { context, tool } = getValidCompleteLineItemCreationArgs();

      const validCustomParameters = {
        "https://www.toolexample.com/lti/score": {
          originality: 94,
          submissionUrl: "https://www.toolexample.com/lti/score/54/5893/essay.pdf",
        },
        "https://www.toolexample.com/another/valid/property": true,
      };

      const INVALID_KEY = "invalid-key";

      const response = await sut.createLineItem({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        context,
        tool,
        label: faker.lorem.sentence(),
        scoreMaximum: 100,
        customParameters: {
          ...validCustomParameters,
          [INVALID_KEY]: "to a valid value tho",
        },
      });

      assert(e.isRight(response));
      expect(response.right.httpStatusCode).toBe(201);

      const persistedLineItem = lineItemsRepo.lineItems[0];

      expect(persistedLineItem.customParameters[INVALID_KEY]).toBeUndefined();
      expect(persistedLineItem.customParameters).toMatchObject(validCustomParameters);
    });
  });
});
