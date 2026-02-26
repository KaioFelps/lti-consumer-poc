import { generateUUID } from "common/src/types/uuid";
import { resolveFactoryOptional } from "ltilib/tests/utils/resolve-nullified-optional";
import { Context } from "$/core/context";
import { LtiToolDeployment } from "$/core/tool-deployment";
import { ToolRecord } from "$/registration/tool-record";
import { NullifyUndefined } from "../types/nullify";
import { createContext } from "./context.factory";
import { createTool } from "./tool.factory";

type CreateToolDeploymentParams = Partial<
  NullifyUndefined<{ id: LtiToolDeployment["id"]; context?: Context; tool: ToolRecord }>
>;

export function createToolDeployment({
  id = generateUUID(),
  context,
  tool = createTool(),
}: CreateToolDeploymentParams = {}) {
  tool.ltiConfiguration.deploymentsIds.push(id.toString());

  return LtiToolDeployment.create({
    id,
    contextId: resolveFactoryOptional(context, createContext)?.id,
    toolId: tool.id,
  });
}

export default {
  createToolDeployment,
};
