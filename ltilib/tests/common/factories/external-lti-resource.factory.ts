import { generateUUID } from "common/src/types/uuid";
import { ExternalLtiResource, IExternalLtiResource } from "$/advantage/external-resource";
import { createContext } from "./context.factory";
import { createTool } from "./tool.factory";

type CreateExternalLtiResourceConstructorArgs = Partial<IExternalLtiResource>;

export function createExternalLtiResource({
  context = createContext(),
  externalToolResourceId = generateUUID(),
  localResourceId = generateUUID(),
  tool = createTool(),
}: CreateExternalLtiResourceConstructorArgs = {}) {
  if (tool.deploymentsIds.length <= 0) {
    tool.deploymentsIds.push(generateUUID());
  }

  return ExternalLtiResource.create({
    externalToolResourceId,
    localResourceId,
    tool,
    context,
  });
}

export default {
  createExternalLtiResource,
};
