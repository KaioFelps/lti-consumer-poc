import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { either, option } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { mountContextId, unmountContextId } from "@/modules/lti/advantage/context";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
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
    context: { columns: { concreteContextId: true, concreteContextType: true } },
    deployment: { with: { tool: true } },
  },
} as const satisfies LtiToolsQueryConfig;

function intoRow(link: LtiResourceLink) {
  return pipe(
    option.fromNullable(link.contextId),
    option.traverse(either.Applicative)((contextId) => unmountContextId(contextId)),
    either.map(
      (context) =>
        ({
          deploymentId: link.deploymentId,
          id: link.id,
          resourceUrl: link.resourceUrl?.toString() ?? null,
          description: link.description ?? null,
          title: link.title ?? null,
          customParameters: link.customParameters,
          ...(option.isSome(context)
            ? {
                contextId: context.value.concreteEntityId,
                contextConcreteType: context.value.concreteType,
              }
            : {
                contextId: null,
                contextConcreteType: null,
              }),
        }) satisfies LtiResourceLinkPlainRow,
    ),
  );
}

function fromRow(row: LtiResourceLinkRow): LtiResourceLink {
  const contextId = row.context
    ? mountContextId(
        row.context.concreteContextId,
        row.context.concreteContextType as ContextConcreteType,
      )
    : undefined;

  return LtiResourceLink.create({
    id: row.id,
    deploymentId: row.deployment.id,
    resourceUrl: row.resourceUrl ? new URL(row.resourceUrl) : undefined,
    toolId: row.deployment.tool.id,
    description: row.description ?? undefined,
    title: row.title ?? undefined,
    customParameters: row.customParameters ?? undefined,
    contextId,
  });
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
