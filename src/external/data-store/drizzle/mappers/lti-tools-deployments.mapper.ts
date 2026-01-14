import type * as schema from "drizzle/schema";
import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import { LtiToolDeployment } from "@/lti/tools/entities/lti-tool-deployment.entity";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolsDeploymentsQueryConfig = DBQueryConfig<
  "many",
  boolean,
  Schema,
  Schema["ltiToolDeployments"]
>;

type LtiToolDeploymentRow = BuildQueryResult<
  Schema,
  Schema["ltiToolDeployments"],
  typeof requiredQueryConfig
>;

const requiredQueryConfig = {
  columns: {
    id: true,
    clientId: true,
    label: true,
  },
} as const satisfies LtiToolsDeploymentsQueryConfig;

function fromRow(row: LtiToolDeploymentRow): LtiToolDeployment {
  return LtiToolDeployment.create({
    id: row.id,
    label: row.label,
    toolId: row.clientId,
  });
}

function intoRow(deployment: LtiToolDeployment): LtiToolDeploymentRow {
  return {
    clientId: deployment.getToolId(),
    id: deployment.getId().toString(),
    label: deployment.getLabel(),
  };
}

export default {
  requiredQueryConfig,
  fromRow,
  intoRow,
};
