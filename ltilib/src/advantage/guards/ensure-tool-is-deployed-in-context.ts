import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { MissingLtiContextError } from "$/assignment-and-grade/errors/missing-lti-context.error";
import { ToolIsNotDeployedInContextError } from "$/assignment-and-grade/errors/tool-is-not-deployed-in-context.error";
import { Context } from "$/core/context";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";

export function ensureToolIsDeployedInContext(
  tool: LtiTool,
  context: Context | undefined,
  deploymentsRepo: LtiToolDeploymentsRepository,
) {
  if (!context) return te.left(new MissingLtiContextError());

  return pipe(
    () => deploymentsRepo.findDeploymentInContextOrGlobal(tool.id, context.id),
    te.map((_) => {}),
    te.mapLeft((error) => {
      if (error.type === "NotFound") return new ToolIsNotDeployedInContextError(tool, context);
      return error;
    }),
  );
}
