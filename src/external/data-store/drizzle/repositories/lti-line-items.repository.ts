import { Injectable } from "@nestjs/common";
import { ltiAssignmentsT, ltiLineItemsT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { type TaskEither } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
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

  public fetchWithContainerFilters(
    context: Context<unknown>,
    tool: LtiTool,
    limit: number,
    page: number,
    filters: Omit<LineItemsContainerFilters, "limit" | "page">,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiLineItem>>> {
    throw new Error("Method not implemented.");
  }
}
