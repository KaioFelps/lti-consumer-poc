import { ltiResourceLinks } from "drizzle/schema";
import { either } from "fp-ts";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import ltiResourceLinksMapper from "@/external/data-store/drizzle/mappers/lti-resource-links.mapper";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity";
import { Context } from "$/core/context";
import { LtiToolDeployment as LtilibToolDeployment } from "$/core/tool-deployment";

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
