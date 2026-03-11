import { either as e } from "fp-ts";
import { ensureHasAnyScope } from "$/advantage/utils/ensure-has-any-scope";
import { Context } from "$/core/context";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { ASSIGNMENT_AND_GRADE_SERVICES_SCOPES, AssignmentAndGradeServiceScopes } from "../scopes";

export async function toolHasAccessToAgs(
  tool: LtiTool,
  platform: Platform,
  context: Context<unknown> | undefined,
  toolAuthorizedAgsScopes: AssignmentAndGradeServiceScopes[],
): Promise<boolean> {
  if (!platform.agsConfiguration) return false;
  if (!context) return false;

  const requiredScopes = ASSIGNMENT_AND_GRADE_SERVICES_SCOPES;
  const toolHasAgsScopes = ensureHasAnyScope({ tool, requiredScopes });

  if (e.isLeft(toolHasAgsScopes)) return false;

  return await platform.agsConfiguration.authorizeServicesClaim({
    context,
    tool,
    toolAgsScopes: toolAuthorizedAgsScopes,
  });
}
