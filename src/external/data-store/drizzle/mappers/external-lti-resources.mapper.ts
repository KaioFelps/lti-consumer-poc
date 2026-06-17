import type * as schema from "drizzle/schema";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { ExternalLtiResource } from "$/advantage/external-resource";
import ltiToolsMapper from "./lti-tools.mapper";

type Schema = ExtractTablesWithRelations<typeof schema>;

type ExternalLtiResourcesQueryConfig = DBQueryConfig<
  "many",
  boolean,
  Schema,
  Schema["externalLtiResourcesT"]
>;

type ExternalLtiResourceRow = BuildQueryResult<
  Schema,
  Schema["externalLtiResourcesT"],
  typeof requiredQueryConfig
>;

const requiredQueryConfig = {
  with: {
    tool: ltiToolsMapper.requiredQueryConfig,
  },
} as const satisfies ExternalLtiResourcesQueryConfig;

function fromRow(row: ExternalLtiResourceRow): ExternalLtiResource {
  return ExternalLtiResource.create({
    externalToolResourceId: row.externalToolResourceId,
    localResourceId: row.id,
    tool: ltiToolsMapper.fromRow(row.tool),
  });
}

export default {
  fromRow,
  requiredQueryConfig,
};
