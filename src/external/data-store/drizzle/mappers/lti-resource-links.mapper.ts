import type * as schema from "drizzle/schema";
import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import { LtiResourceLink } from "$/core/resource-link";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolsQueryConfig = DBQueryConfig<
  "many",
  boolean,
  Schema,
  Schema["ltiResourceLinks"]
>;

type LtiResourceLinkRow = BuildQueryResult<
  Schema,
  Schema["ltiResourceLinks"],
  typeof requiredQueryConfig
>;

const requiredQueryConfig = {
  with: {
    context: { columns: { id: true } },
    deployment: { with: { tool: true } },
  },
} as const satisfies LtiToolsQueryConfig;

function fromRow(link: LtiResourceLinkRow): LtiResourceLink {
  return LtiResourceLink.create({
    id: link.id,
    deploymentId: link.deployment.id,
    resource: new URL(link.resourceUrl),
    toolId: link.deployment.tool.id,
    contextId: link.context?.id,
    description: link.description ?? undefined,
    title: link.title ?? undefined,
    customParameters: link.customParameters ?? {},
  });
}

export default {
  fromRow,
  requiredQueryConfig,
};
