import { Injectable } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid";
import { externalLtiResourcesT } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { DrizzleClient } from "../client";
import externalLtiResourcesMapper from "../mappers/external-lti-resources.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleExternalLtiResourcesRepository extends ExternalLtiResourcesRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly txManager: DrizzleTransactionManager,
  ) {
    super();
  }

  /**
   * @note Does not support including a `Context`. See implementation notes.
   */
  public findByExternalId(
    externalResourceId: string,
    toolId: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.query.externalLtiResourcesT.findFirst({
            ...externalLtiResourcesMapper.requiredQueryConfig,
            where: and(
              eq(externalLtiResourcesT.toolId, toolId),
              eq(externalLtiResourcesT.externalToolResourceId, externalResourceId),
            ),
          }),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleExternalLtiResourcesRepository.name} ` +
                "when finding external LTI resource by ID.",
              error as Error,
            ),
          }),
      ),
      te.filterOrElseW(
        (row) => !!row,
        () => {
          return new LtiRepositoryError({
            type: "NotFound",
            subject: ExternalLtiResource.name,
            cause: new ResourceNotFoundError({
              errorMessageIdentifier: "lti:ags:find-external-resource-by-id:errors:not-found",
              messageParams: { id: externalResourceId },
            }),
          });
        },
      ),
      te.map(externalLtiResourcesMapper.fromRow),
    )();
  }

  /**
   * @note Does not support including a `Context`. See implementation notes.
   */
  public findOrCreateByExternalId(
    externalResourceId: string,
    toolId: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();

    return pipe(
      te.tryCatch(
        async () => {
          const [{ id }] = await client
            .insert(externalLtiResourcesT)
            .values({
              toolId: toolId,
              externalToolResourceId: externalResourceId,
              id: generateUUID(),
            })
            .onConflictDoUpdate({
              target: [externalLtiResourcesT.toolId, externalLtiResourcesT.externalToolResourceId],
              set: { externalToolResourceId: externalResourceId },
            })
            .returning({ id: externalLtiResourcesT.id });

          const fullResource = await client.query.externalLtiResourcesT.findFirst({
            ...externalLtiResourcesMapper.requiredQueryConfig,
            where: eq(externalLtiResourcesT.id, id),
          });

          return fullResource!;
        },
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleExternalLtiResourcesRepository.name} ` +
                "when finding or creating external LTI resource.",
              error as Error,
            ),
          }),
      ),
      te.map(externalLtiResourcesMapper.fromRow),
    )();
  }
}
