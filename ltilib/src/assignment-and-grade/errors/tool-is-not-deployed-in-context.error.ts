import { Context } from "$/core/context";
import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { ToolRecord } from "$/registration/tool-record";

export class ToolIsNotDeployedInContextError extends LtilibError {
  public constructor(tool: ToolRecord, context: Context) {
    super(
      403,
      `Tool ${tool.name} is not globally deployed nor deployed in the context with id '${context.id}'.`,
    );
  }
}
