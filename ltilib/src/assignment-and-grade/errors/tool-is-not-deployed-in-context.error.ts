import { Context } from "$/core/context.js";
import { LtilibError } from "$/core/errors/bases/ltilib.error.js";
import { LtiTool } from "$/core/tool.js";

export class ToolIsNotDeployedInContextError extends LtilibError {
  public constructor(tool: LtiTool, context: Context<unknown>) {
    super(
      403,
      `Tool ${tool.name} is not globally deployed nor deployed in the context with id '${context.id}'.`,
    );
  }
}
