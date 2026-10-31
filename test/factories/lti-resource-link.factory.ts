import { ltiResourceLinks } from "drizzle/schema.js";
import { either } from "fp-ts";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import ltiResourceLinksMapper from "@/external/data-store/drizzle/mappers/lti-resource-links.mapper.js";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity.js";
import { Context } from "$/core/context.js";
import { LtiToolDeployment as LtilibToolDeployment } from "$/core/tool-deployment.js";
import { createResourceLink } from "$/tests/common/factories/resource-link.factory.js";

type OriginalFactoryParams = Exclude<Parameters<typeof createResourceLink>[0], undefined>;
type FactoryParams = Partial<
  Omit<OriginalFactoryParams, "contextId" | "deploymentId"> & {
    context: Context<unknown>;
    deployment: LtiToolDeployment | LtilibToolDeployment;
  }
>;

async function createAndPersist(drizzle: DrizzleClient, overridingProps: FactoryParams = {}) {
  const { context, deployment, ...props } = overridingProps;
  const resourceLink = createResourceLink({
    ...props,
    contextId: context?.id,
    deploymentId:
      deployment instanceof LtiToolDeployment ? deployment?.getId()?.toString() : deployment?.id,
  });

  const resourceLinkPayload = ltiResourceLinksMapper.intoRow(resourceLink);
  assert(either.isRight(resourceLinkPayload));
  await drizzle.getClient().insert(ltiResourceLinks).values(resourceLinkPayload.right);

  return resourceLink;
}

export default {
  create: createResourceLink,
  createAndPersist,
};
