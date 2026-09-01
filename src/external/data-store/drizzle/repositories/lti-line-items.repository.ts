import { Injectable } from "@nestjs/common";
import * as schema from "drizzle/schema";
import {
  externalLtiResourcesT,
  ltiAssignmentsT,
  ltiLineItemsT,
  ltiResourceLinks,
  ltiToolDeployments,
} from "drizzle/schema";
import {
  and,
  asc,
  ColumnsSelection,
  ExtractTablesWithRelations,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgSelectBase } from "drizzle-orm/pg-core";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { type TaskEither } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { unmountContextId } from "@/modules/lti/advantage/context";
import { InvalidComposedContextIdError } from "@/modules/lti/advantage/errors/invalid-composed-context-id.error";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { DrizzleClient } from "../client";
import ltiLineItemsMapper from "../mappers/lti-line-items.mapper";
import { DrizzleTransactionManager, Transaction } from "../transaction-manager";

type Schema = typeof schema;

@Injectable()
export class DrizzleLtiLineItemsRepository extends LtiLineItemsRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly transactionManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public create(lineItem: LtiLineItem, tool: LtiTool): Promise<Either<LtiRepositoryError, void>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.Do,
      te.bind("resolvedAssignmentId", () => this.resolveAssignmentId(lineItem.resourceLink?.id)),
      te.chainEitherKW(({ resolvedAssignmentId }) => {
        // resolved assignment exists per resource link id, also we don't even use resource link directly... check the schema
        const isOrphan = !resolvedAssignmentId && !lineItem.externalResource;

        return ltiLineItemsMapper.intoRow(
          lineItem,
          resolvedAssignmentId,
          isOrphan ? tool.id : null,
        );
      }),
      te.chainW((row) =>
        te.tryCatch(
          () => client.insert(ltiLineItemsT).values(row),
          (error) => new LtiRepositoryError({ type: "ExternalError", cause: error }),
        ),
      ),
      te.map(() => undefined),
      te.mapLeft((error) => {
        // this error is external relative to ltilib (it's a platform specific error)
        if (error instanceof InvalidComposedContextIdError) {
          return new LtiRepositoryError({ type: "ExternalError", cause: error });
        }

        return error;
      }),
    )();
  }

  /**
   * Finds the LTI Assignment related to the resource link identified by `resourceLinkId`.
   */
  private resolveAssignmentId(
    resourceLinkId: string | undefined,
  ): TaskEither<LtiRepositoryError, string | null> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    if (!resourceLinkId) return te.right(null);

    return te.tryCatch(
      async () => {
        const assignment = await client.query.ltiAssignmentsT.findFirst({
          where: eq(ltiAssignmentsT.resourceLinkId, resourceLinkId),
          columns: { assignmentId: true },
        });

        return assignment ? assignment.assignmentId : null;
      },
      (error) => new LtiRepositoryError({ type: "ExternalError", cause: error }),
    );
  }

  public findExisting(
    tool: LtiTool,
    context: Context<ContextConcreteType>,
    resourceLinkId: string | undefined,
    resourceId: string | undefined,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.fromEither(unmountContextId(context.id)),
      te.mapLeft((error) => new LtiRepositoryError({ type: "ExternalError", cause: error })),
      te.chainW(({ concreteEntityId, concreteType }) =>
        te.tryCatch(
          () => {
            const matches = client
              .select({ id: ltiLineItemsT.id })
              .from(ltiLineItemsT)
              .leftJoin(
                externalLtiResourcesT,
                eq(ltiLineItemsT.externalResourceId, externalLtiResourcesT.id),
              )
              .leftJoin(
                ltiAssignmentsT,
                eq(ltiLineItemsT.ltiAssignmentId, ltiAssignmentsT.assignmentId),
              )
              .leftJoin(ltiResourceLinks, eq(ltiAssignmentsT.resourceLinkId, ltiResourceLinks.id))
              .leftJoin(
                ltiToolDeployments,
                eq(ltiResourceLinks.deploymentId, ltiToolDeployments.id),
              )
              .where(
                and(
                  tag ? eq(ltiLineItemsT.tag, tag) : isNull(ltiLineItemsT.tag),
                  eq(ltiLineItemsT.concreteContextId, concreteEntityId),
                  eq(ltiLineItemsT.concreteContextType, concreteType),
                  resourceId
                    ? eq(externalLtiResourcesT.externalToolResourceId, resourceId)
                    : isNull(ltiLineItemsT.externalResourceId),
                  resourceLinkId
                    ? eq(ltiResourceLinks.id, resourceLinkId)
                    : isNull(ltiLineItemsT.ltiAssignmentId),
                  or(
                    eq(ltiToolDeployments.clientId, tool.id),
                    and(
                      isNull(ltiLineItemsT.ltiAssignmentId),
                      eq(externalLtiResourcesT.toolId, tool.id),
                    ),
                    and(
                      isNull(ltiLineItemsT.ltiAssignmentId),
                      isNull(ltiLineItemsT.externalResourceId),
                      eq(ltiLineItemsT.orphanCreatingToolId, tool.id),
                    ),
                  ),
                ),
              );

            return client.query.ltiLineItemsT.findFirst({
              ...ltiLineItemsMapper.requiredQueryConfig,
              where: inArray(ltiLineItemsT.id, matches),
            });
          },
          (error) => {
            const irrecoverableError = new IrrecoverableError(
              `Error occurred in ${DrizzleLtiLineItemsRepository.name} when trying to find line item by external resource ` +
                `(of id "${resourceId}) and ${tag ? `tag "${tag}"` : "null tag"}.`,
              error as Error,
            );

            return new LtiRepositoryError({ type: "ExternalError", cause: irrecoverableError });
          },
        ),
      ),
      te.chainEitherKW((row) => {
        if (row) return e.right(row);

        const notFoundError = new ResourceNotFoundError({
          errorMessageIdentifier: "lti:ags:line-items:errors:line-item-not-found",
          messageParams: {},
        });

        return e.left(
          new LtiRepositoryError({
            type: "NotFound",
            cause: notFoundError,
            subject: LtiLineItem.name,
          }),
        );
      }),
      te.map((row) => ltiLineItemsMapper.fromRow(row, context)),
    )();
  }

  public findManyByResourceLink(
    resourceLinkId: LtiResourceLink["id"],
    context: Context<ContextConcreteType>,
    limit: number,
  ) {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      this.resolveAssignmentId(resourceLinkId),

      te.chainW((resolvedAssignmentId) => {
        if (!resolvedAssignmentId) return te.right([]);

        return te.tryCatch(
          () =>
            client.query.ltiLineItemsT.findMany({
              ...ltiLineItemsMapper.requiredQueryConfig,
              where: eq(ltiLineItemsT.ltiAssignmentId, resolvedAssignmentId),
              limit: limit,
            }),
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiLineItemsRepository.name} when finding line items by resource link from database.`,
                error as Error,
              ),
            }),
        );
      }),
      te.map((rows) => rows.map((row) => ltiLineItemsMapper.fromRow(row, context))),
    )();
  }

  public findById(
    lineItemId: LtiLineItem["id"],
    context: Context<ContextConcreteType>,
  ): Promise<Either<LtiRepositoryError, LtiLineItem<ContextConcreteType>>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.tryCatch(
        () =>
          client.query.ltiLineItemsT.findFirst({
            ...ltiLineItemsMapper.requiredQueryConfig,
            where: eq(ltiLineItemsT.id, lineItemId.toString()),
          }),
        (error) => {
          const irrecoverableError = new IrrecoverableError(
            `Error occurred in ${DrizzleLtiLineItemsRepository.name} when trying to find line item of id "${lineItemId}".`,
            error as Error,
          );

          return new LtiRepositoryError({ type: "ExternalError", cause: irrecoverableError });
        },
      ),
      te.chainEitherKW((row) => {
        if (row) return e.right(row);

        const notFoundError = new ResourceNotFoundError({
          errorMessageIdentifier: "lti:ags:line-items:errors:line-item-not-found",
          messageParams: {},
        });

        return e.left(
          new LtiRepositoryError({
            type: "NotFound",
            cause: notFoundError,
            subject: LtiLineItem.name,
          }),
        );
      }),
      te.map((row) => ltiLineItemsMapper.fromRow(row, context)),
    )();
  }

  /**
   * Builds the WHERE clauses to enforce constraints such as `belongsToContext`
   * and `isAccessibleToTool` are valid. Also applies potential filters.
   *
   * @note Depends on {@link containerJoinedFrom}'s joins statements.
   */
  private buildContainerAccessConditions(
    context: Context<unknown>,
    tool: LtiTool,
    filters: Omit<LineItemsContainerFilters, "limit" | "page">,
  ) {
    return pipe(
      unmountContextId(context.id),
      e.mapLeft(
        (error) =>
          new LtiRepositoryError({
            cause: error,
            type: "ExternalError",
          }),
      ),
      e.map(({ concreteEntityId, concreteType }) => [
        eq(ltiLineItemsT.concreteContextId, concreteEntityId),
        eq(ltiLineItemsT.concreteContextType, concreteType),
        or(isNull(ltiLineItemsT.ltiAssignmentId), eq(ltiToolDeployments.clientId, tool.id)),
        or(isNull(ltiLineItemsT.externalResourceId), eq(externalLtiResourcesT.toolId, tool.id)),
      ]),
      e.map((conditions) => {
        if (filters.resourceLinkId) {
          conditions.push(eq(ltiResourceLinks.id, filters.resourceLinkId));
        }

        if (filters.resourceId) {
          conditions.push(eq(externalLtiResourcesT.externalToolResourceId, filters.resourceId));
        }

        if (filters.tag) {
          conditions.push(eq(ltiLineItemsT.tag, filters.tag));
        }

        return conditions;
      }),
      e.map((conditions) => and(...conditions)),
      te.fromEither,
    );
  }

  public fetchWithContainerFilters(
    context: Context<unknown>,
    tool: LtiTool,
    limit: number,
    page: number,
    filters: Omit<LineItemsContainerFilters, "limit" | "page">,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiLineItem>>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    const offset = (page - 1) * limit;

    type Schema = ExtractTablesWithRelations<typeof schema>;

    const prepareJoinsForLineItemsSelect = <T extends ColumnsSelection>(
      select: PgSelectBase<
        Schema["ltiLineItemsT"]["dbName"],
        T,
        "partial",
        Record<"lti_line_items", "not-null">
      >,
    ) =>
      select
        .leftJoin(ltiAssignmentsT, eq(ltiLineItemsT.ltiAssignmentId, ltiAssignmentsT.assignmentId))
        .leftJoin(ltiResourceLinks, eq(ltiAssignmentsT.resourceLinkId, ltiResourceLinks.id))
        .leftJoin(ltiToolDeployments, eq(ltiResourceLinks.deploymentId, ltiToolDeployments.id))
        .leftJoin(
          externalLtiResourcesT,
          eq(ltiLineItemsT.externalResourceId, externalLtiResourcesT.id),
        );

    return pipe(
      te.Do,
      te.bindW("where", () => this.buildContainerAccessConditions(context, tool, filters)),
      te.bindW("lineItems", ({ where }) =>
        te.tryCatch(
          async () =>
            client.query.ltiLineItemsT.findMany({
              ...ltiLineItemsMapper.requiredQueryConfig,
              where: inArray(
                ltiLineItemsT.id,
                prepareJoinsForLineItemsSelect(
                  client.select({ id: ltiLineItemsT.id }).from(ltiLineItemsT),
                )
                  .where(where)
                  .orderBy(asc(ltiLineItemsT.id))
                  .limit(limit)
                  .offset(offset),
              ),
            }),
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiLineItemsRepository.name} when resolving line item ids with container filters from database.`,
                error as Error,
              ),
            }),
        ),
      ),
      te.bindW("count", ({ where }) =>
        te.tryCatch(
          async () => {
            const result = await prepareJoinsForLineItemsSelect(
              client
                .select({ count: sql<number>`count(distinct ${ltiLineItemsT.id})` })
                .from(ltiLineItemsT),
            ).where(where);

            return Number(result[0]?.count ?? 0);
          },
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiLineItemsRepository.name} when counting line items with container filters from database.`,
                error as Error,
              ),
            }),
        ),
      ),
      te.map(({ lineItems, count }) => {
        if (lineItems.length === 0) return { values: [] as LtiLineItem[], count };

        const mappedLineItems = {
          count,
          values: lineItems.map((row) => ltiLineItemsMapper.fromRow(row, context as Context)),
        } satisfies LtiRepositoryPaginatedResponse<LtiLineItem<unknown>>;

        return mappedLineItems;
      }),
    )();
  }

  public update(
    lineItem: LtiLineItem.UpdateRecord,
    tool: LtiTool,
    context: Context,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    const id = lineItem.id.toString();
    const externalResourceId = lineItem.externalResource?.localResourceId ?? null;
    const ownedMatches = this.buildOwningLineItemsMatchesStatement(client, id, tool.id);

    return pipe(
      te.tryCatch(
        () =>
          client
            .update(ltiLineItemsT)
            .set({
              tag: lineItem.tag ?? null,
              label: lineItem.label,
              endDateTime: lineItem.endDateTime ?? null,
              startDateTime: lineItem.startDateTime ?? null,
              gradesReleased: lineItem.gradesReleased ?? null,
              customParameters:
                Object.keys(lineItem.customParameters).length > 0
                  ? ({ ...lineItem.customParameters } as Record<string, string>)
                  : null,
              externalResourceId,
              // ltiAssignmentId is intentionally left untouched: UpdateRecord
              // carries no resourceLink/assignment info to change it.
              // update record has no resource link nor assignment, so we have no means
              // to check it previously without making another lookup query.
              //
              // hence we derive this info from the existing data (in the database)
              // using a in-place SQL statement!
              orphanCreatingToolId: sql`
                CASE WHEN ${ltiLineItemsT.ltiAssignmentId} IS NULL
                     AND ${externalResourceId === null ? sql`TRUE` : sql`FALSE`}
                THEN ${tool.id}
                ELSE NULL
                END
              `,
            })
            .where(inArray(ltiLineItemsT.id, ownedMatches))
            .returning({ id: ltiLineItemsT.id }),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiLineItemsRepository.name} when updating line item "${id}".`,
              error as Error,
            ),
          }),
      ),
      te.chainEitherKW((updatedRows) => {
        if (updatedRows.length > 0) return e.right(true as const);

        return e.left(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new ResourceNotFoundError({
              errorMessageIdentifier: "lti:ags:line-items:errors:line-item-not-found",
              messageParams: {},
            }),
            subject: LtiLineItem.name,
          }),
        );
      }),
      te.chainW(() =>
        te.tryCatch(
          () =>
            client.query.ltiLineItemsT.findFirst({
              ...ltiLineItemsMapper.requiredQueryConfig,
              where: eq(ltiLineItemsT.id, id),
            }),
          (error) =>
            new LtiRepositoryError({
              type: "ExternalError",
              cause: new IrrecoverableError(
                `Error occurred in ${DrizzleLtiLineItemsRepository.name} when reloading line item "${id}" after update.`,
                error as Error,
              ),
            }),
        ),
      ),
      te.chainEitherKW((row) => {
        if (row) return e.right(row);

        return e.left(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new ResourceNotFoundError({
              errorMessageIdentifier: "lti:ags:line-items:errors:line-item-not-found",
              messageParams: {},
            }),
            subject: LtiLineItem.name,
          }),
        );
      }),
      te.map((row) => ltiLineItemsMapper.fromRow(row, context)),
    )();
  }

  public delete(
    lineItemId: LtiLineItem["id"],
    tool: LtiTool,
  ): Promise<Either<LtiRepositoryError, void>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();
    const ownedMatches = this.buildOwningLineItemsMatchesStatement(
      client,
      lineItemId.toString(),
      tool.id,
    );

    return pipe(
      te.tryCatch(
        () => client.delete(ltiLineItemsT).where(inArray(ltiLineItemsT.id, ownedMatches)).execute(),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiLineItemsRepository.name} when deleting line item "${lineItemId}".`,
              error as Error,
            ),
          }),
      ),
      te.map(() => {}),
    )();
  }

  private buildOwningLineItemsMatchesStatement(
    client: NodePgDatabase<Schema> | Transaction,
    lineItemId: string,
    toolId: string,
  ) {
    return client
      .select({ id: ltiLineItemsT.id })
      .from(ltiLineItemsT)
      .leftJoin(ltiAssignmentsT, eq(ltiLineItemsT.ltiAssignmentId, ltiAssignmentsT.assignmentId))
      .leftJoin(ltiResourceLinks, eq(ltiAssignmentsT.resourceLinkId, ltiResourceLinks.id))
      .leftJoin(ltiToolDeployments, eq(ltiResourceLinks.deploymentId, ltiToolDeployments.id))
      .leftJoin(
        externalLtiResourcesT,
        eq(ltiLineItemsT.externalResourceId, externalLtiResourcesT.id),
      )
      .where(
        and(
          eq(ltiLineItemsT.id, lineItemId),
          or(
            eq(ltiToolDeployments.clientId, toolId),
            and(isNull(ltiLineItemsT.ltiAssignmentId), eq(externalLtiResourcesT.toolId, toolId)),
            and(
              isNull(ltiLineItemsT.ltiAssignmentId),
              isNull(ltiLineItemsT.externalResourceId),
              eq(ltiLineItemsT.orphanCreatingToolId, toolId),
            ),
          ),
        ),
      );
  }
}
