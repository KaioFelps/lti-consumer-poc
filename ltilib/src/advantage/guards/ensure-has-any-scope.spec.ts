import { either as e } from "fp-ts";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { MissingAnyScopeError } from "../errors/missing-scope.error";
import { ensureHasAnyScope } from "./ensure-has-any-scope";

describe("[LTI Advantage/Guards] Ensure Has Any Scope", () => {
  it.each([
    [
      "single string scope exact match",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      ["https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"],
    ],
    ["single array scope exact match", ["scope:read"], ["scope:read"]],
    ["one of multiple required scopes", ["scope:read", "scope:write"], ["scope:read"]],
    [
      "all of multiple required scopes",
      ["scope:read", "scope:write"],
      ["scope:read", "scope:write"],
    ],
    [
      "required scope mixed with extra tool scopes",
      "scope:read",
      ["scope:other", "scope:read", "scope:extra"],
    ],
  ])("should allow it when required scopes are %s", async (_, requiredScopes, toolScopes) => {
    const tool = createTool({ scopes: toolScopes });
    const result = await ensureHasAnyScope({ requiredScopes, tool })();

    assert(e.isRight(result));
    expect(result.right).toBeUndefined();
  });

  it.each([
    ["tool lacks the single required string scope", "scope:read", ["scope:write"]],
    ["tool lacks all required array scopes", ["scope:read", "scope:write"], ["scope:other"]],
    ["tool has no scopes at all", ["scope:read"], []],
    ["required scopes array is empty (edge case)", [], ["scope:read"]],
  ])(
    "should return Left(MissingAnyScopeError) when required is %s",
    async (_, requiredScopes, toolScopes) => {
      const tool = createTool({ scopes: toolScopes });

      const result = await ensureHasAnyScope({ requiredScopes, tool })();

      assert(e.isLeft(result));
      expect(result.left).toBeInstanceOf(MissingAnyScopeError);
      expect(result.left.missingScopes).toEqual(requiredScopes);
    },
  );
});
