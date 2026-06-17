import { ltiToolDeployments } from "drizzle/schema";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import ltiToolsDeploymentsMapper from "@/external/data-store/drizzle/mappers/lti-tools-deployments.mapper";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity";

type FactoryParams = Parameters<typeof createToolDeployment>[0];

async function createAndPersist(drizzle: DrizzleClient, overridingProps: FactoryParams = {}) {
  const deployment = createToolDeployment(overridingProps);

  await drizzle
    .getClient()
    .insert(ltiToolDeployments)
    .values(
      ltiToolsDeploymentsMapper.intoRow(
        LtiToolDeployment.create({
          label: "test",
          toolId: deployment.toolId,
          id: deployment.id,
        }),
      ),
    );

  return deployment;
}

export default {
  create: createToolDeployment,
  createAndPersist,
};
