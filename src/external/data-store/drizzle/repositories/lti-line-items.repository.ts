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
import { PgSelectBase } from "drizzle-orm/pg-core";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { type TaskEither } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
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
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleLtiLineItemsRepository extends LtiLineItemsRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly transactionManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public save(lineItem: LtiLineItem): Promise<Either<LtiRepositoryError, void>> {
    const client = this.transactionManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.Do,
      te.bind("resolvedAssignmentId", () => this.resolveAssignmentId(lineItem.resourceLink?.id)),
      te.chainEitherKW(({ resolvedAssignmentId }) => {
        return ltiLineItemsMapper.intoRow(lineItem, resolvedAssignmentId);
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

  public findByExternalResourceAndTag(
    resourceId: string,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    throw new Error("Method not implemented.");
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

  public findById(lineItemId: LtiLineItem["id"]): Promise<Either<LtiRepositoryError, LtiLineItem>> {
    throw new Error("Method not implemented.");
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
}
