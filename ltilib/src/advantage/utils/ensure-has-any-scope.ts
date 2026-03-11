import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiTool } from "$/core/tool";
import { MissingAnyScopeError, MissingScopeError } from "../errors/missing-scope.error";

type Params = {
  requiredScopes: string | readonly string[];
  tool: LtiTool;
};

export function ensureHasAnyScope({
  tool,
  requiredScopes,
}: Params): Either<MissingScopeError, void> {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  const hasAnyScope = scopes.some((scope) => {
    return tool.scopes.includes(scope);
  });

  return hasAnyScope ? e.right(undefined) : e.left(new MissingAnyScopeError(requiredScopes));
}
