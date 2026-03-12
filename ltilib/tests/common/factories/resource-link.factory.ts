import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { ILtiResourceLink, LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { createTool } from "./tool.factory";

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
