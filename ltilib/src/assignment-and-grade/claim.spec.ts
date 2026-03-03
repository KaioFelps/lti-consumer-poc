import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createFullLineItem } from "ltilib/tests/common/factories/line-item.factory";
import platformFactory from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { AssignmentAndGradeServiceClaim } from "./claim";
import { ASSIGNMENT_AND_GRADE_SERVICES_SCOPES, AssignmentAndGradeServiceScopes } from "./scopes";

describe("[AGS] Assignment and Grade Service Claim", () => {
  it("should always include lineitem endpoint when a specific line item is given and any scope is present", () => {
    const context = createContext();
    const resourceLink = createResourceLink({ contextId: context.id });
    const lineItem = createFullLineItem({ context }, { resourceLink });
    const agsConfig = platformFactory.createAgsConfiguration();

    for (const scope of ASSIGNMENT_AND_GRADE_SERVICES_SCOPES) {
      const result = AssignmentAndGradeServiceClaim.create({
        agsConfig,
        specificLineItem: lineItem,
        context,
        scopes: [scope],
      });

      assert(e.isRight(result));

      const claim = result.right.intoLtiClaim()[AssignmentAndGradeServiceClaim.KEY];

      expect(claim).toHaveProperty("lineitem");
    }
  });

  it("should omit line item endpoint when no specific line item is given", () => {
    const context = createContext();
    const agsConfig = platformFactory.createAgsConfiguration();

    const result = AssignmentAndGradeServiceClaim.create({
      agsConfig,
      specificLineItem: undefined,
      context,
      scopes: [...ASSIGNMENT_AND_GRADE_SERVICES_SCOPES],
    });

    assert(e.isRight(result));

    const claim = result.right.intoLtiClaim()[AssignmentAndGradeServiceClaim.KEY];

    expect(claim).not.toHaveProperty("lineitem");
  });

  it.each([
    { shouldInclude: true, scopes: [AssignmentAndGradeServiceScopes.Lineitem] },
    { shouldInclude: true, scopes: [AssignmentAndGradeServiceScopes.LineitemReadonly] },
    {
      shouldInclude: true,
      scopes: [
        AssignmentAndGradeServiceScopes.Lineitem,
        AssignmentAndGradeServiceScopes.LineitemReadonly,
      ],
    },
    {
      shouldInclude: false,
      scopes: [
        AssignmentAndGradeServiceScopes.ResultReadonly,
        AssignmentAndGradeServiceScopes.Score,
      ],
    },
  ])(
    "should include line items container endpoint only when any of lineitems scope is present",
    ({ shouldInclude, scopes }) => {
      const context = createContext();
      const agsConfig = platformFactory.createAgsConfiguration();

      const result = AssignmentAndGradeServiceClaim.create({
        agsConfig,
        specificLineItem: undefined,
        context,
        scopes,
      });

      assert(e.isRight(result));

      const claim = result.right.intoLtiClaim()[AssignmentAndGradeServiceClaim.KEY];
      const EXPECTED_PROPERTY = "lineitems";

      if (shouldInclude) expect(claim).toHaveProperty(EXPECTED_PROPERTY);
      else expect(claim).not.toHaveProperty(EXPECTED_PROPERTY);
    },
  );
});
