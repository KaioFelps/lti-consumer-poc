import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { LtiResourceLink } from "$/core/resource-link";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiResourceLinks"]>;

type LtiResourceLinkRow = BuildQueryResult<
  Schema,
  Schema["ltiResourceLinks"],
  typeof requiredQueryConfig
>;

type LtiResourceLinkPlainRow = Omit<LtiResourceLinkRow, "context" | "deployment">;

const requiredQueryConfig = {
  with: {
    context: { columns: { id: true } },
    deployment: { with: { tool: true } },
  },
} as const satisfies LtiToolsQueryConfig;

function intoRow(link: LtiResourceLink): LtiResourceLinkPlainRow {
  return {
    deploymentId: link.deploymentId,
    id: link.id,
    resourceUrl: link.resource.toString(),
    contextId: link.contextId ?? null,
    description: link.description ?? null,
    title: link.title ?? null,
    customParameters: link.customParameters,
  };
}

function fromRow(row: LtiResourceLinkRow): LtiResourceLink {
  return LtiResourceLink.create({
    id: row.id,
    deploymentId: row.deployment.id,
    resource: new URL(row.resourceUrl),
    toolId: row.deployment.tool.id,
    contextId: row.context?.id,
    description: row.description ?? undefined,
    title: row.title ?? undefined,
    customParameters: row.customParameters ?? undefined,
  });
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
