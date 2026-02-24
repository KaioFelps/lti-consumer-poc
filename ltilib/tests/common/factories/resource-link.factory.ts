import { faker } from "@faker-js/faker";
import { AllOptional } from "common/src/types/optional";
import { generateUUID } from "common/src/types/uuid";
import { ILtiResourceLink, LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";
import { createTool } from "./tool.factory";

type CreateResourceLinkConstructorArgs = Omit<AllOptional<ILtiResourceLink>, "toolId"> & {
  tool?: ToolRecord;
};

export function createResourceLink({
  deploymentId = generateUUID(),
  tool = createTool(),
  resource = new URL(faker.internet.url({ protocol: "https" })),
  contextId,
  customParameters,
  description,
  id,
  title = faker.book.title(),
}: CreateResourceLinkConstructorArgs = {}): LtiResourceLink {
  if (!tool.ltiConfiguration.deploymentsIds.includes(deploymentId)) {
    tool.ltiConfiguration.deploymentsIds.push(deploymentId);
  }

  return LtiResourceLink.create({
    deploymentId,
    resource,
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
