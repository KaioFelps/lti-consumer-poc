import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { either, option } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { unmountContextId } from "@/modules/lti/advantage/context";
import { LtiContextAdapter } from "@/modules/lti/advantage/context/adapters";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import ltiToolsMapper from "./lti-tools.mapper";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiLineItemsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiLineItemsT"]>;

type LtiLineItemLinkRow = BuildQueryResult<
  Schema,
  Schema["ltiLineItemsT"],
  typeof requiredQueryConfig
>;

type LtiLineItemPlainRow = Omit<LtiLineItemLinkRow, "externalResource">;

const requiredQueryConfig = {
  with: {
    externalResource: {
      columns: { externalToolResourceId: true, id: true, toolId: true },
      with: { tool: { ...ltiToolsMapper.requiredQueryConfig } },
    },
  },
} as const satisfies LtiLineItemsQueryConfig;

function intoRow(lineitem: LtiLineItem, ltiAssignmentId: string | null) {
  return pipe(
    option.fromNullable(lineitem.context.id),
    option.traverse(either.Applicative)((contextId) => unmountContextId(contextId)),
    either.map(
      (context) =>
        ({
          customParameters:
            Object.keys(lineitem.customParameters).length > 0
              ? ({ ...lineitem.customParameters } as Record<string, string>)
              : null,
          endDateTime: lineitem.endDateTime ?? null,
          startDateTime: lineitem.startDateTime ?? null,
          gradesReleased: lineitem.gradesReleased ?? null,
          externalResourceId: lineitem.externalResource?.localResourceId ?? null,
          id: lineitem.id.toString(),
          label: lineitem.label,
          tag: lineitem.tag ?? null,
          ltiAssignmentId,
          scoreMaximum: lineitem.scoreMaximum,
          ...(option.isSome(context)
            ? {
                concreteContextId: context.value.concreteEntityId,
                concreteContextType: context.value.concreteType,
              }
            : {
                concreteContextId: null,
                concreteContextType: null,
              }),
        }) satisfies LtiLineItemPlainRow,
    ),
  );
}

function fromRow(row: LtiLineItemLinkRow, contextAdapter: LtiContextAdapter<ContextConcreteType>) {
  const externalResourceRow = row.externalResource;

  return LtiLineItem.create({
    context: contextAdapter.getContext(),
    label: row.label,
    resourceLink: undefined,
    scoreMaximum: row.scoreMaximum,
    customParameters: row.customParameters ?? undefined,
    endDateTime: row.endDateTime ? new Date(row.endDateTime) : undefined,
    startDateTime: row.startDateTime ? new Date(row.startDateTime) : undefined,
    externalResource: externalResourceRow
      ? ExternalLtiResource.create({
          externalToolResourceId: externalResourceRow.externalToolResourceId,
          localResourceId: externalResourceRow.id,
          tool: ltiToolsMapper.fromRow(externalResourceRow.tool),
        })
      : undefined,
    gradesReleased: row.gradesReleased ?? undefined,
    id: row.id,
    tag: row.tag ?? undefined,
  });
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
