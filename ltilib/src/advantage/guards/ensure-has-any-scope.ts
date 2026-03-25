import { taskEither as te } from "fp-ts";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { LtiTool } from "$/core/tool";
import { MissingAnyScopeError, MissingScopeError } from "../errors/missing-scope.error";

type Params = {
  requiredScopes: string | readonly string[];
  tool: LtiTool;
};

export function ensureHasAnyScope({
  tool,
  requiredScopes,
}: Params): TaskEither<MissingScopeError, void> {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  const hasAnyScope = scopes.some((scope) => {
    return tool.scopes.includes(scope);
  });

  return hasAnyScope ? te.right(undefined) : te.left(new MissingAnyScopeError(requiredScopes));
}
