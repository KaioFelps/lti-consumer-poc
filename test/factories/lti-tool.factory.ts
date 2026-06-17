import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { DrizzleLtiToolsRepository } from "@/external/data-store/drizzle/repositories/lti-tools.repository";
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity";

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
