import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import {
  MissingLtiContextError,
  ToolIsNotDeployedInContextError,
} from "$/assignment-and-grade/errors.js";
import { Context } from "$/core/context.js";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository.js";
import { LtiTool } from "$/core/tool.js";

/**
 * Checks whether the tool is deployed in the given LTI context.
 * This check passes only when:
 * 1. there is a context
 * 2. there is at least one deployment of the tool in the given tool OR the tool has a global deployment
 */
export function ensureToolIsDeployedInContext(
  tool: LtiTool,
  context: Context<unknown> | undefined,
  deploymentsRepo: LtiToolDeploymentsRepository,
) {
  if (!context) return te.left(new MissingLtiContextError());

  return pipe(
    () => deploymentsRepo.findDeploymentInContextTreeOrGlobal(tool.id, context),
    te.map((_) => {}),
    te.mapLeft((error) => {
      if (error.type === "NotFound") return new ToolIsNotDeployedInContextError(tool, context);
      return error;
    }),
  );
}
