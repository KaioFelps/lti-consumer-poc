import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import { DrizzleLtiToolsRepository } from "@/external/data-store/drizzle/repositories/lti-tools.repository.js";
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity.js";
import { createTool } from "$/tests/common/factories/tool.factory.js";

type FactoryParams = Parameters<typeof createTool>[0];

async function createAndPersist(drizzle: DrizzleClient, overridingProps: FactoryParams = {}) {
  const tool = createTool(overridingProps);

  const toolsRepo = new DrizzleLtiToolsRepository(drizzle);
  await toolsRepo.upsertTool(new LtiTool(tool));

  return tool;
}

export default {
  create: createTool,
  createAndPersist,
};
