import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { LtiToolPreview } from "@/modules/lti/tools/entities/lti-tool-preview.entity";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolPreviewsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiTools"]>;

type LtiToolPreviewRow = BuildQueryResult<Schema, Schema["ltiTools"], typeof requiredQueryConfig>;

const requiredQueryConfig = {
  columns: {
    id: true,
    logoUri: true,
    homePageUri: true,
    description: true,
  },
  with: {
    oauthClient: {
      columns: { name: true },
    },
  },
} as const satisfies LtiToolPreviewsQueryConfig;

function fromRow(row: LtiToolPreviewRow): LtiToolPreview {
  return LtiToolPreview.createUnchecked({
    id: row.id,
    name: row.oauthClient.name,
    description: row.description ?? undefined,
    homePageUri: row.homePageUri ?? undefined,
    logoUri: row.logoUri ?? undefined,
  });
}

export default {
  fromRow,
  requiredQueryConfig,
};
