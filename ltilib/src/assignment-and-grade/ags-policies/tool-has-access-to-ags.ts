import { either as e } from "fp-ts";
import { ensureHasAnyScope } from "$/advantage/guards/ensure-has-any-scope.js";
import { Context } from "$/core/context.js";
import { Platform } from "$/core/platform.js";
import { LtiTool } from "$/core/tool.js";
import {
  ASSIGNMENT_AND_GRADE_SERVICES_SCOPES,
  AssignmentAndGradeServiceScopes,
} from "../scopes.js";

export async function toolHasAccessToAgs(
  tool: LtiTool,
  platform: Platform,
  context: Context<unknown> | undefined,
  toolAuthorizedAgsScopes: AssignmentAndGradeServiceScopes[],
): Promise<boolean> {
  if (!platform.agsConfiguration) return false;
  if (!context) return false;

  const requiredScopes = ASSIGNMENT_AND_GRADE_SERVICES_SCOPES;
  const toolHasAgsScopes = await ensureHasAnyScope({ tool, requiredScopes })();

  if (e.isLeft(toolHasAgsScopes)) return false;

  return await platform.agsConfiguration.authorizeServicesClaim({
    context,
    tool,
    toolAgsScopes: toolAuthorizedAgsScopes,
  });
}
