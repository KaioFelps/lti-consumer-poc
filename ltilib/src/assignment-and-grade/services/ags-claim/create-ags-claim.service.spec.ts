import { either as e, option as o } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import lineItemFactory, {
  createFullLineItem,
} from "ltilib/tests/common/factories/line-item.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryLtiLineItemsRepository } from "ltilib/tests/common/in-memory-repositories/line-items.repository";
import { AssignmentAndGradeServiceClaim } from "$/assignment-and-grade/claim";
import { ASSIGNMENT_AND_GRADE_SERVICES_SCOPES } from "$/assignment-and-grade/scopes";
import { Platform } from "$/core/platform";
import { CreateService } from "./create-ags-claim.service";

describe("[AGS] Create Ags Claim Service", async () => {
  const basicPlatform = await createPlatform();

  const context = createContext();
  const tool = createTool({ scopes: [...ASSIGNMENT_AND_GRADE_SERVICES_SCOPES] });

  const deployment = createToolDeployment();
  const resourceLink = createResourceLink({
    tool,
    deploymentId: deployment.id,
    contextId: context.id,
  });

  let lineItemsRepo: InMemoryLtiLineItemsRepository;

  let sut: CreateService;

  const createSutWithPlatform = (platform: Platform) => {
    sut = new CreateService(platform, lineItemsRepo);
  };

  beforeEach(async () => {
    lineItemsRepo = new InMemoryLtiLineItemsRepository();
    createSutWithPlatform(basicPlatform);
  });

  it("should return no AGS claim when AGS is not enabled (there is no AGS config in the `Platform` instance)", async () => {
    const platform = await createPlatform({ agsConfiguration: null });
    createSutWithPlatform(platform);

    const result = await sut.execute({ tool, context, resourceLink });

    assert(e.isRight(result), "it should execute even when AGS is not enabled");
    expect(result.right).toBe(o.none);
  });

  it("should return no AGS claim when there is no context", async () => {
    const result = await sut.execute({ tool, context: undefined, resourceLink });

    assert(e.isRight(result), "it should execute even if there is no context");
    expect(o.isNone(result.right)).toBeTruthy();
  });

  it("should produce a valid AGS claim when it's enabled and there is a context", async () => {
    const result = await sut.execute({ tool, context, resourceLink });

    assert(e.isRight(result));
    assert(o.isSome(result.right));

    let claim = result.right.value.intoLtiClaim();
    expect(claim).toHaveProperty(AssignmentAndGradeServiceClaim.KEY);

    claim = claim[AssignmentAndGradeServiceClaim.KEY] as object;

    expect(claim).toMatchObject({
      lineitems: expect.any(String),
      scope: expect.any(Array),
    });
  });

  it("should include a `lineitem` property if and only if there is a lineitem with one-to-one relationship with a resource link", async () => {
    const existingLineItem = createFullLineItem(undefined, { resourceLink });
    lineItemsRepo.lineItems.push(existingLineItem);

    const result = await sut.execute({ tool, context, resourceLink });

    assert(e.isRight(result));
    assert(o.isSome(result.right));

    let claim = result.right.value.intoLtiClaim();
    expect(claim).toHaveProperty(AssignmentAndGradeServiceClaim.KEY);

    claim = claim[AssignmentAndGradeServiceClaim.KEY] as object;

    expect(claim).toHaveProperty("lineitem");
    expect(claim["lineitem"]).toBeTypeOf("string");
  });

  it("should only contain AGS scopes", async () => {
    const result = await sut.execute({ tool, context, resourceLink });

    assert(e.isRight(result));
    assert(o.isSome(result.right));

    const claims = result.right.value.intoLtiClaim();
    const scopes = claims[AssignmentAndGradeServiceClaim.KEY].scope;
    const allowedScopes = ASSIGNMENT_AND_GRADE_SERVICES_SCOPES as readonly string[];

    expect(Array.isArray(scopes)).toBeTruthy();
    expect((scopes as Array<string>).every((scope) => allowedScopes.includes(scope)));
  });

  it.each(
    [
      { description: "there is no line items", shouldDisplay: false, lineItemsCount: 0 },
      { description: "there is one line item", shouldDisplay: true, lineItemsCount: 1 },
      { description: "there are many line items", shouldDisplay: false, lineItemsCount: 2 },
    ].map((args) => ({
      ...args,
      testName: `should ${args.shouldDisplay ? "" : "not"} display lineitem endpoint when $description related to the given resource link`,
    })),
  )("$testName", async ({ lineItemsCount, shouldDisplay }) => {
    for (let i = 0; i < lineItemsCount; i++) {
      const lineItem = lineItemFactory.createFull({ context, tool }, { resourceLink });
      lineItemsRepo.lineItems.push(lineItem);
    }

    const result = await sut.execute({ resourceLink, tool, context });

    assert(e.isRight(result));
    assert(o.isSome(result.right));

    const claims = result.right.value.intoLtiClaim()[AssignmentAndGradeServiceClaim.KEY] as object;

    const PROPERTY = "lineitem";
    if (shouldDisplay) expect(claims).toHaveProperty(PROPERTY);
    else expect(claims).not.toHaveProperty(PROPERTY);
  });

  it("should return `none` if tool has not any of AGS scopes", async () => {
    const tool = createTool();

    const result = await sut.execute({ resourceLink, tool, context });

    assert(e.isRight(result), "it should be a valid AGS claim creation request");
    assert(o.isNone(result.right), "it should return `none` since not any AGS scope is present");
  });
});
