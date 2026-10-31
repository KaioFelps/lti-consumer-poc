import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid.js";
import { ILtiResourceLink, LtiResourceLink } from "$/core/resource-link.js";
import { LtiTool } from "$/core/tool.js";
import { createTool } from "./tool.factory.js";

type CreateResourceLinkConstructorArgs = Omit<Partial<ILtiResourceLink>, "toolId"> & {
  tool?: LtiTool;
};

export function createResourceLink({
  deploymentId = generateUUID(),
  tool = createTool(),
  resourceUrl,
  contextId,
  customParameters,
  description,
  id,
  title = faker.book.title(),
}: CreateResourceLinkConstructorArgs = {}): LtiResourceLink {
  if (!tool.deploymentsIds.includes(deploymentId)) {
    tool.deploymentsIds.push(deploymentId);
  }

  return LtiResourceLink.create({
    deploymentId,
    resourceUrl,
    toolId: tool.id,
    contextId,
    customParameters,
    description,
    id,
    title,
  });
}

export default {
  createResourceLink,
};
