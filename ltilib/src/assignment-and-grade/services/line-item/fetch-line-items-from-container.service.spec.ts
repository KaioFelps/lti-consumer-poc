/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
import lineItemFactory from "ltilib/tests/common/factories/line-item.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryExternalLtiResourcesRepository } from "ltilib/tests/common/in-memory-repositories/external-lti-resources.repository";
import { InMemoryLtiLineItemsRepository } from "ltilib/tests/common/in-memory-repositories/line-items.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { getPowerSet } from "ltilib/tests/utils/get-powerset";
import { MissingScopeError } from "$/advantage/errors/missing-scope.error";
import { NotAcceptableMediaTypeError } from "$/advantage/errors/not-acceptable-media-type.error";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { ToolIsNotDeployedInContextError } from "$/assignment-and-grade/errors/tool-is-not-deployed-in-context.error";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { PresentedLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { LtiLineItemServices } from ".";

describe("[AGS] Fetch Line Items From Container Service", async () => {
  let platform: Platform;
  let resourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let externalResourcesRepo: InMemoryExternalLtiResourcesRepository;
  let lineItemsRepo: InMemoryLtiLineItemsRepository;
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  let sut: LtiLineItemServices;

  beforeEach(async () => {
    platform = await createPlatform();
    resourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    externalResourcesRepo = new InMemoryExternalLtiResourcesRepository();
    lineItemsRepo = new InMemoryLtiLineItemsRepository();
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();

    sut = new LtiLineItemServices(
      platform,
      resourceLinksRepo,
      externalResourcesRepo,
      lineItemsRepo,
      deploymentsRepo,
    );
  });

  const getValidEntities = ({ context = createContext() }: { context?: Context } = {}) => {
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ tool, context });

    const resourceLink = createResourceLink({ contextId: context.id, tool });
    const resource = createExternalLtiResource({ context, tool });

    deploymentsRepo.deployments.push(deployment);
    resourceLinksRepo.resourceLinks.push(resourceLink);
    externalResourcesRepo.externalLtiResources.push(resource);

    return { tool, context, deployment, resourceLink, resource };
  };

  const getSutValidParams = ({
    context,
    tool,
    page = 1,
    filters,
    defaultLimit = 12,
  }: {
    context: Context;
    tool: LtiTool;
    page?: number;
    filters?: Partial<LineItemsContainerFilters>;
    defaultLimit?: number;
  }) => {
    const resolvedFilters = { page, ...(filters ?? {}) };
    return {
      acceptHeader: LtiAdvantageMediaType.LineItemContainer,
      contentTypeHeader: undefined,
      context,
      defaultLimit,
      tool,
      filters: resolvedFilters,
    };
  };

  const generateLineItems = ({
    context,
    count,
    externalResource,
    resourceLink,
    tag,
  }: {
    context: Context;
    resourceLink?: LtiResourceLink;
    externalResource?: ExternalLtiResource;
    tag?: string;
    count: number;
  }) => {
    const lineItems = new Array<LtiLineItem>(count).fill(
      lineItemFactory.createMinimal({ context, externalResource, resourceLink, tag }),
    );

    lineItemsRepo.lineItems.push(...lineItems);
  };

  it("should require `lineitems` or `lineitems.readonly` scopes", async () => {
    const acceptedScopes = [
      [AssignmentAndGradeServiceScopes.Lineitem],
      [AssignmentAndGradeServiceScopes.LineitemReadonly],
      [AssignmentAndGradeServiceScopes.Lineitem, AssignmentAndGradeServiceScopes.LineitemReadonly],
    ];

    const lackingScopes = [
      [],
      [AssignmentAndGradeServiceScopes.ResultReadonly, AssignmentAndGradeServiceScopes.Score],
    ];

    for (const scopes of acceptedScopes) {
      const { tool, context } = getValidEntities();
      tool.scopes = scopes;

      const result = await sut.fetchFromContainer(getSutValidParams({ context, tool }));
      assert(e.isRight(result), "it should be successful");
    }

    for (const scopes of lackingScopes) {
      const { tool, context } = getValidEntities();
      tool.scopes = scopes;

      const result = await sut.fetchFromContainer(getSutValidParams({ context, tool }));
      assert(
        e.isLeft(result),
        "it should have failed since tool scopes lacks required scopes for this service",
      );
      expect(result.left).toBeInstanceOf(MissingScopeError);
      expect(result.left.httpStatusCode).toBe(403);
    }
  });

  it("should require line items container media type", async () => {
    const { tool, context } = getValidEntities();
    const params = getSutValidParams({ tool, context });

    const someInvalidMediaTypes = [LtiAdvantageMediaType.LineItem, "application/json"];
    const acceptedMediaTypes = [
      LtiAdvantageMediaType.LineItemContainer,
      "*/*",
      "application/*",
      "text/html,application/json,*/*",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ];

    for (const mediaType of someInvalidMediaTypes) {
      const result = await sut.fetchFromContainer({ ...params, acceptHeader: mediaType });
      assert(e.isLeft(result));
      expect(result.left).toBeInstanceOf(NotAcceptableMediaTypeError);
    }

    for (const mediaType of acceptedMediaTypes) {
      const result = await sut.fetchFromContainer({ ...params, acceptHeader: mediaType });
      assert(
        e.isRight(result),
        "it should be successful since line items container is an accepted media type",
      );
    }
  });

  describe("Response", async () => {
    let response: HttpResponseWrapper<unknown[], unknown[]>;

    beforeEach(async () => {
      lineItemsRepo.lineItems = [];

      const { tool, context } = getValidEntities();
      const params = getSutValidParams({ tool, context });
      const result = await sut.fetchFromContainer(params);

      assert(e.isRight(result));
      response = result.right;
    });

    it("should be an instance of `HttpResponseWrapper`", () => {
      expect(response).toBeInstanceOf(HttpResponseWrapper);
    });

    it("should have 200 OK HTTP status code", () => {
      expect(response.httpStatusCode).toBe(200);
    });

    it("should have 'Content-Type' header set to line items container media type", () => {
      expect(response.headers.get("content-type")).toBe(LtiAdvantageMediaType.LineItemContainer);
    });

    it("should have a 'Link' header with appliable RFC 8288 links", () => {
      expect(response.headers.has("link")).toBeTruthy();

      const link = response.headers.get("link")!;
      // These two relationships must always be present, even with 0 line items.
      // It's non-normative though
      expect(link).toEqual(expect.stringContaining('rel="first"'));
      expect(link).toEqual(expect.stringContaining('rel="last"'));
    });

    it("should contain a list of presented line items in `content` field", () => {
      expect(Array.isArray(response.content)).toBeTruthy();
      response.content.forEach((lineItem) => {
        expect(lineItem).not.toBeInstanceOf(LtiLineItem);
        expect(lineItem).toMatchObject(
          expect.objectContaining({
            id: expect.any(String),
            label: expect.any(String),
            scoreMaximum: expect.any(Number),
          } satisfies PresentedLtiLineItem),
        );
      });
    });

    it("should provide the original list of line items in `rawContent` field", () => {
      expect(Array.isArray(response.rawContent)).toBeTruthy();
      response.rawContent.forEach((element) => expect(element).toBeInstanceOf(LtiLineItem));
    });

    it("should return an empty list when there is no line items", async () => {
      expect(
        lineItemsRepo.lineItems.length,
        "repository should be empty for this test's purposes",
      ).toBe(0);

      expect(response.httpStatusCode).toBe(200);
      expect(Array.isArray(response.content)).toBeTruthy();
      expect(response.content).toHaveLength(0);
    });
  });

  describe("Container Request Filters [3.2.4]", () => {
    test(
      "`resource_link_id` should limit the line items returned to only those which have been " +
        "associated with the specified tool platform's LTI link ID (as passed in the 'resource_link_id' " +
        "LTI message parameter)",
      async () => {
        const { context, tool, resourceLink } = getValidEntities();

        const RESOURCE_LINK_ASSOCIATED_LINE_ITEMS_COUNT = 10;
        const DISSOCIATED_LINE_ITEMS_COUNT = 50;

        generateLineItems({ context, count: DISSOCIATED_LINE_ITEMS_COUNT });
        generateLineItems({
          context,
          resourceLink,
          count: RESOURCE_LINK_ASSOCIATED_LINE_ITEMS_COUNT,
        });

        expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
          RESOURCE_LINK_ASSOCIATED_LINE_ITEMS_COUNT + DISSOCIATED_LINE_ITEMS_COUNT,
        );

        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page: 1, resourceLinkId: resourceLink.id },
        });

        assert(e.isRight(result));

        const response = result.right;
        expect(response.content.length).toBe(RESOURCE_LINK_ASSOCIATED_LINE_ITEMS_COUNT);
        response.content.forEach((lineItem) => {
          expect(lineItem["resourceLinkId"]).toBe(resourceLink.id);
        });
      },
    );

    test(
      "`resource_id` should limit the line items returned to only those which " +
        "have been associated with the specified tool resource identifier",
      async () => {
        const { context, tool, resource } = getValidEntities();

        const RESOURCE_ASSOCIATED_LINE_ITEMS_COUNT = 10;
        const DISSOCIATED_LINE_ITEMS_COUNT = 50;

        generateLineItems({ context, count: DISSOCIATED_LINE_ITEMS_COUNT });
        generateLineItems({
          context,
          externalResource: resource,
          count: RESOURCE_ASSOCIATED_LINE_ITEMS_COUNT,
        });

        expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
          RESOURCE_ASSOCIATED_LINE_ITEMS_COUNT + DISSOCIATED_LINE_ITEMS_COUNT,
        );

        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page: 1, resourceId: resource.externalToolResourceId },
        });

        assert(e.isRight(result));

        const response = result.right;

        expect(response.content.length).toBe(RESOURCE_ASSOCIATED_LINE_ITEMS_COUNT);
        response.content.forEach((lineItem) => {
          expect(lineItem["resourceId"]).toBe(resource.externalToolResourceId);
        });
      },
    );

    test(
      "`tag` should limit the line items returned to only those which have been " +
        "associated with the specified tag.",
      async () => {
        const { context, tool } = getValidEntities();

        const TAG = "foo";
        const TAG_ASSOCIATED_LINE_ITEMS_COUNT = 10;
        const DISSOCIATED_LINE_ITEMS_COUNT = 50;

        generateLineItems({ context, count: DISSOCIATED_LINE_ITEMS_COUNT });
        generateLineItems({ context, tag: TAG, count: TAG_ASSOCIATED_LINE_ITEMS_COUNT });

        expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
          TAG_ASSOCIATED_LINE_ITEMS_COUNT + DISSOCIATED_LINE_ITEMS_COUNT,
        );

        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page: 1, limit: 100, tag: TAG },
        });

        assert(e.isRight(result));

        const response = result.right;

        expect(response.content.length).toBe(TAG_ASSOCIATED_LINE_ITEMS_COUNT);
        response.content.forEach((lineItem) => expect(lineItem["tag"]).toBe(TAG));
      },
    );

    test("`limit` should restrict the number of line items returned", async () => {
      const TOTAL = 100;

      const { context, tool } = getValidEntities();
      generateLineItems({ context, count: TOTAL });

      expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
        TOTAL,
      );

      for (const limit of [0, 1, 2, 3, 5, 10, 15, 20]) {
        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page: 1, limit },
        });

        assert(e.isRight(result));
        expect(result.right.content.length).toBe(limit);
      }
    });

    test("`next` relationship link is present when there is next page", async () => {
      const TOTAL = 100;

      const { context, tool } = getValidEntities();
      generateLineItems({ context, count: TOTAL });

      expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
        TOTAL,
      );

      const LIMIT = 25;
      const TOTAL_PAGES = TOTAL / LIMIT;

      let page = 1;
      for (page; page < TOTAL_PAGES; page++) {
        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page, limit: LIMIT },
        });

        assert(e.isRight(result));
        expect(result.right.headers.get("link")).toEqual(expect.stringContaining('rel="next"'));
      }

      const lastPage = ++page;
      const result = await sut.fetchFromContainer({
        ...getSutValidParams({ context, tool }),
        filters: { page: lastPage, limit: LIMIT },
      });

      assert(e.isRight(result));
      expect(result.right.headers.get("link")).not.toEqual(expect.stringContaining('rel="next"'));
    });

    test("`prev` relationship link is present when there is a previous page", async () => {
      const TOTAL = 100;

      const { context, tool } = getValidEntities();
      generateLineItems({ context, count: TOTAL });

      expect(lineItemsRepo.lineItems.length, "line items repo should have been populated").toBe(
        TOTAL,
      );

      const LIMIT = 25;
      const TOTAL_PAGES = TOTAL / LIMIT;

      let page = 1;
      const firstPage = page++;

      const result = await sut.fetchFromContainer({
        ...getSutValidParams({ context, tool }),
        filters: { page: firstPage, limit: LIMIT },
      });

      assert(e.isRight(result));
      expect(result.right.headers.get("link")).not.toEqual(expect.stringContaining('rel="prev"'));

      for (page; page <= TOTAL_PAGES; page++) {
        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { page, limit: LIMIT },
        });

        assert(e.isRight(result));
        expect(result.right.headers.get("link")).toEqual(expect.stringContaining('rel="prev"'));
      }
    });

    test("filters should be applied in an AND fashion", async () => {
      const { context, tool, resource, resourceLink } = getValidEntities();
      const TAG = "foo";

      const setups = [
        {},
        { tag: TAG },
        { tag: TAG, resourceLink },
        { tag: TAG, externalResource: resource },
        { resourceLink },
        { resourceLink, externalResource: resource },
        { externalResource: resource },
        { tag: TAG, resourceLink, externalResource: resource },
      ];

      setups.forEach((setup) => generateLineItems({ context, count: 10, ...setup }));

      const possibleFilters = {
        tag: TAG,
        resourceId: resource.externalToolResourceId,
        resourceLinkId: resourceLink.id,
      } as const;

      type FilterKey = keyof typeof possibleFilters;

      const possibleFiltersKeys = Object.keys(possibleFilters) as (keyof typeof possibleFilters)[];
      const filtersCombinations = getPowerSet(possibleFiltersKeys);

      const getFiltersObject = (filtersKeys: FilterKey[]) => {
        const filters = {};

        filtersKeys.forEach((key) => {
          filters[key] = possibleFilters[key];
        });

        return filters;
      };

      const testFiltersAreApplied = async (
        filters: Partial<LineItemsContainerFilters>,
        appliedFiltersKeys: FilterKey[],
      ) => {
        const result = await sut.fetchFromContainer({
          ...getSutValidParams({ context, tool }),
          filters: { ...filters, page: 1, limit: 1000 },
        });

        assert(e.isRight(result));

        expect(
          result.right.content.length,
          "content should not be empty for this test's purposes",
        ).not.toBe(0);

        result.right.content.forEach((lineItem) => {
          for (const filterKey of appliedFiltersKeys) {
            expect(lineItem[filterKey]).toEqual(filters[filterKey]);
          }
        });
      };

      for (const filtersKeys of filtersCombinations) {
        const filters = getFiltersObject(filtersKeys);
        await testFiltersAreApplied(filters, filtersKeys);
      }
    });
  });

  it("should not let a tool access line items attached to another tool", async () => {
    const { context, tool: ownerTool, resource, resourceLink } = getValidEntities();
    generateLineItems({ context, count: 1, resourceLink });
    generateLineItems({ context, count: 1, externalResource: resource });

    const { tool } = getValidEntities({ context });

    const filtersList: Partial<LineItemsContainerFilters>[] = [
      { resourceId: resource.externalToolResourceId },
      { resourceLinkId: resourceLink.id },
    ];

    // should not be accessible to other tools
    for (const filters of filtersList) {
      const result = await sut.fetchFromContainer({
        ...getSutValidParams({ context, tool }),
        filters: { ...filters, limit: 100, page: 1 },
      });

      assert(e.isRight(result));
      expect(result.right.content.length).toBe(0);
    }

    // but should be accessible to owner tool
    for (const filters of filtersList) {
      const result = await sut.fetchFromContainer({
        ...getSutValidParams({ context, tool: ownerTool }),
        filters: { ...filters, limit: 100, page: 1 },
      });

      assert(e.isRight(result));
      expect(result.right.content.length).toBe(1);
    }
  });

  it("should let tools see any line item in its context that is not attached to any line item in any fashion", async () => {
    const TOTAL = 50;
    const { context, tool } = getValidEntities();

    generateLineItems({ context, count: TOTAL });

    const result = await sut.fetchFromContainer(
      getSutValidParams({ context, tool, filters: { limit: 100 } }),
    );

    assert(e.isRight(result));
    expect(result.right.content.length).toBe(TOTAL);
  });

  it("should require line item to be deployed in the given context to see any line item of it", async () => {
    const TOTAL = 50;
    const { context, tool } = getValidEntities();

    // deploys tool in a different context than the one from the line items to check
    tool.deploymentsIds = [];
    const anotherContext = createContext();
    const toolDeploymentInAnotherContext = createToolDeployment({ tool, context: anotherContext });
    deploymentsRepo.deployments = [toolDeploymentInAnotherContext];

    generateLineItems({ context, count: TOTAL });

    const result = await sut.fetchFromContainer(getSutValidParams({ context, tool }));

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(ToolIsNotDeployedInContextError);
  });

  it("should never return line items from a different context even if they belong to the same tool", async () => {
    const { context, tool, resourceLink } = getValidEntities();
    const differentContext = createContext();
    const toolDeploymentInDifferentContext = createToolDeployment({
      context: differentContext,
      tool,
    });

    deploymentsRepo.deployments.push(toolDeploymentInDifferentContext);

    const LINE_ITEMS_IN_CURRENT_CONTEXT = 20;
    generateLineItems({ context, count: LINE_ITEMS_IN_CURRENT_CONTEXT, resourceLink });
    generateLineItems({ context: differentContext, count: 25 });

    const result = await sut.fetchFromContainer(
      getSutValidParams({ context, tool, defaultLimit: 100 }),
    );

    assert(e.isRight(result));
    expect(result.right.content.length).toBe(LINE_ITEMS_IN_CURRENT_CONTEXT);
    result.right.rawContent.forEach((lineItem) => {
      expect(lineItem.belongsToContext(context)).toBeTruthy();
    });
  });
});
