/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
import {
  createFullLineItem,
  createMinimalLineItem,
} from "ltilib/tests/common/factories/line-item.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryExternalLtiResourcesRepository } from "ltilib/tests/common/in-memory-repositories/external-lti-resources.repository";
import { InMemoryLtiLineItemsRepository } from "ltilib/tests/common/in-memory-repositories/line-items.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { InvalidMediaTypeError } from "$/advantage/errors/invalid-media-type.error";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { InaccessibleLineItemError } from "$/assignment-and-grade/errors/inaccessible-line-item.error";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors/missing-platform-ags-configuration.error";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
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
    const lineItem = createMinimalLineItem();

    lineItemsRepo.lineItems.push(lineItem);
    toolDeploymentsRepo.deployments.push(deployment);
    externalLtiResourcesRepo.externalLtiResources.push(resource);
    ltiResourceLinksRepo.resourceLinks.push(resourceLink);

    return { tool, context, resourceLink, resource, deployment, lineItem };
  };

  it("should require AGS configurations to be enabled in `Platform`", async () => {
    const platform = await createPlatform({ agsConfiguration: null });
    await recreateSutWithPlatform(platform);

    const { tool, lineItem, context } = getValidCompleteLineItemCreationArgs();

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      lineItemId: lineItem.id,
      context,
      tool,
    });

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(MissingPlatformAgsConfigurationError);
  });

  it("should require LTI lineitem media type", async () => {
    const { tool, lineItem, context } = getValidCompleteLineItemCreationArgs();

    const result = await sut.find({
      acceptHeader: "anyInvalidMediaType",
      tool,
      lineItemId: lineItem.id,
      context,
    });

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(InvalidMediaTypeError);
    expect(result.left.httpStatusCode).toBe(415);
  });

  it.each([
    {
      tool: createTool({
        scopes: [
          AssignmentAndGradeServiceScopes.Score,
          AssignmentAndGradeServiceScopes.ResultReadonly,
        ],
      }),
      shouldAllow: false,
    },
    { tool: createTool({ scopes: [] }), shouldAllow: false },
    { tool: createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] }), shouldAllow: true },
    {
      tool: createTool({ scopes: [AssignmentAndGradeServiceScopes.LineitemReadonly] }),
      shouldAllow: true,
    },
  ])(
    "should require lineitem (readonly or read/write) scope for the tool to find the lineitem",
    async ({ tool, shouldAllow }) => {
      const context = createContext();
      const lineItem = createMinimalLineItem();
      const deployment = createToolDeployment({ tool, context });

      lineItemsRepo.lineItems.push(lineItem);
      toolDeploymentsRepo.deployments.push(deployment);

      const result = await sut.find({
        tool,
        acceptHeader: LtiAdvantageMediaType.LineItem,
        lineItemId: lineItem.id,
        context,
      });

      if (shouldAllow) {
        assert(e.isRight(result));
        expect(result.right.httpStatusCode).toBe(200);
        return;
      }

      assert(e.isLeft(result));
      expect(result.left.httpStatusCode).toBe(403);
    },
  );

  it("should require the tool to be deployed in the same context as the line item being searched", async () => {
    const { context, lineItem } = getValidCompleteLineItemCreationArgs();
    const toolNotFromSameContext = createTool({
      scopes: [AssignmentAndGradeServiceScopes.Lineitem],
    });

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      context,
      lineItemId: lineItem.id,
      tool: toolNotFromSameContext,
    });

    assert(e.isLeft(result));
    expect(result.left.httpStatusCode).toBe(404);
  });

  it("should allow tools with global deployment to search for a lineitem not attached to a specific tool by resource nor resource link", async () => {
    const { context, lineItem } = getValidCompleteLineItemCreationArgs();
    const globallyDeployedTool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ tool: globallyDeployedTool, context: null });
    toolDeploymentsRepo.deployments.push(deployment);

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      tool: globallyDeployedTool,
      lineItemId: lineItem.id,
      context,
    });

    assert(e.isRight(result));
    expect(result.right.httpStatusCode).toBe(200);
    expect(result.right.rawContent.id).toEqual(lineItem.id);
  });

  it.each([
    (() => {
      const context = createContext();
      const tool = createTool();
      const resourceLink = createResourceLink({ contextId: context.id, tool });
      const lineItem = createFullLineItem({ context, tool }, { resourceLink });
      return { lineItem, context, entity: "resource link" };
    })(),
    (() => {
      const context = createContext();
      const tool = createTool();
      const resource = createExternalLtiResource({ context, tool });
      const lineItem = createFullLineItem({ context, tool }, { externalResource: resource });
      return { lineItem, context, entity: "external resource" };
    })(),
  ])(
    "should require the lineitem's $entity to belong to the tool searching for it",
    async ({ lineItem, context }) => {
      const otherTool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
      const otherToolsDeployment = createToolDeployment({ tool: otherTool, context });

      toolDeploymentsRepo.deployments.push(otherToolsDeployment);
      lineItemsRepo.lineItems.push(lineItem);

      const result = await sut.find({
        acceptHeader: LtiAdvantageMediaType.LineItem,
        lineItemId: lineItem.id,
        tool: otherTool,
        context,
      });

      assert(e.isLeft(result));
      expect(result.left).toBeInstanceOf(InaccessibleLineItemError);
      expect(result.left.httpStatusCode).toBe(404);
    },
  );

  it("should find an existing lineitem with 200 HTTP response if the tool has access to it", async () => {
    const { tool, context, lineItem } = getValidCompleteLineItemCreationArgs();

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      lineItemId: lineItem.id,
      context,
      tool,
    });

    assert(e.isRight(result));
    expect(result.right.httpStatusCode).toBe(200);
    expect(result.right.rawContent.id).toEqual(lineItem.id);
  });

  it("should respond with lineitem content type", async () => {
    const { tool, context, lineItem } = getValidCompleteLineItemCreationArgs();

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      lineItemId: lineItem.id,
      context,
      tool,
    });

    assert(e.isRight(result));
    expect(result.right.headers).toHaveProperty("Content-Type");
    expect(result.right.headers["Content-Type"]).toEqual(LtiAdvantageMediaType.LineItem);
  });

  it("should suggest a 404 NOT FOUND HTTP response when line item does not exist", async () => {
    const { context, lineItem, tool } = getValidCompleteLineItemCreationArgs();

    // explicitly reset line items store
    lineItemsRepo.lineItems = [];

    const result = await sut.find({
      acceptHeader: LtiAdvantageMediaType.LineItem,
      lineItemId: lineItem.id,
      context,
      tool,
    });

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(InaccessibleLineItemError);
    expect(result.left.httpStatusCode).toBe(404);
  });
});
