import { generateUUID } from "common/src/types/uuid.js";
import { Context } from "$/core/context.js";
import { LtiTool } from "$/core/tool.js";
import { LtiToolDeployment } from "$/core/tool-deployment.js";
import { resolveFactoryOptional } from "$/tests/utils/resolve-nullified-optional.js";
import { NullifyUndefined } from "../types/nullify.js";
import { createContext } from "./context.factory.js";
import { createTool } from "./tool.factory.js";

type CreateToolDeploymentParams = Partial<
  NullifyUndefined<{ id: LtiToolDeployment["id"]; context?: Context<unknown>; tool: LtiTool }>
>;

export function createToolGlobalDeployment({
  id = generateUUID(),
  tool = createTool(),
}: Omit<CreateToolDeploymentParams, "context">) {
  tool.deploymentsIds.push(id.toString());

  return LtiToolDeployment.create({
    id,
    toolId: tool.id,
  });
}

export function createToolDeployment({
  id = generateUUID(),
  context,
  tool = createTool(),
}: CreateToolDeploymentParams = {}) {
  tool.deploymentsIds.push(id.toString());

  return LtiToolDeployment.create({
    id,
    contextId: resolveFactoryOptional(context, createContext)?.id,
    toolId: tool.id,
  });
}

export default {
  createDeployment: createToolDeployment,
  createGlobalDeployment: createToolGlobalDeployment,
};
