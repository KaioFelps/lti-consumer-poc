import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { ToolRecord } from "$/registration/tool-record";
import { MissingAnyScopeError, MissingScopeError } from "../errors/missing-scope.error";

type Params = {
  requiredScopes: string | string[];
  tool: ToolRecord;
};

export function ensureHasAnyScope({
  tool,
  requiredScopes,
}: Params): Either<MissingScopeError, void> {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  const hasAnyScope = scopes.some((scope) => {
    const toolScopes = tool.scope.split(" ");
    return toolScopes.includes(scope);
  });

  return hasAnyScope ? e.right(undefined) : e.left(new MissingAnyScopeError(requiredScopes));
}
