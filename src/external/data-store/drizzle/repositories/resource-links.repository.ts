import { Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { ltiResourceLinks, ltiToolDeployments } from "drizzle/schema.js";
import { and, eq, inArray, SQLWrapper } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ResourceLinkNotFoundError } from "@/modules/lti/resource-links/errors/resource-link-not-found.error.js";
import { LtiResourceLinksRepository } from "@/modules/lti/resource-links/resource-links.repository.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { FindManyParams } from "$/core/repositories/resource-links.repository.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { DrizzleClient } from "../client.js";
import ltiResourceLinksMapper from "../mappers/lti-resource-links.mapper.js";
import { DrizzleTransactionManager } from "../transaction-manager.js";

@Injectable()
export class DrizzleLtiResourceLinksRepository extends LtiResourceLinksRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly txManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public async findMany({ withDeploymentId, withToolId, withContextId }: FindManyParams = {}) {
    const rootFilters: SQLWrapper[] = [];

    if (withDeploymentId) {
      rootFilters.push(eq(ltiResourceLinks.deploymentId, withDeploymentId));
    }

    if (withContextId) {
      rootFilters.push(eq(ltiResourceLinks.contextId, withContextId));
    }

    if (withToolId) {
      const deploymentsFromTool = this.drizzle
        .getClient()
        .select({ id: ltiToolDeployments.id })
        .from(ltiToolDeployments)
        .where(eq(ltiToolDeployments.clientId, withToolId));

      rootFilters.push(inArray(ltiResourceLinks.deploymentId, deploymentsFromTool));
    }

    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiResourceLinks.findMany({
            ...ltiResourceLinksMapper.requiredQueryConfig,
            where: rootFilters.length > 0 ? and(...rootFilters) : undefined,
          }),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding many resource links from database.`,
              error as Error,
            ),
          }),
      ),
      te.map((rows) => rows.map(ltiResourceLinksMapper.fromRow)),
    )();
  }

  public async create(resourceLink: LtiResourceLink) {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();

    return await pipe(
      ltiResourceLinksMapper.intoRow(resourceLink),
      te.fromEither,
      te.chainW((value) =>
        te.tryCatch(
          async () => {
            await client.insert(ltiResourceLinks).values(value);
          },
          (error) => {
            return new IrrecoverableError(
              `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when creating resource link.`,
              error as Error,
            );
          },
        ),
      ),
    )();
  }

  public async deleteById(resourceLinkId: UUID): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        async () => {
          await this.drizzle
            .getClient()
            .delete(ltiResourceLinks)
            .where(eq(ltiResourceLinks.id, resourceLinkId.toString()));
        },
        (error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiResourceLinksRepository.name} when deleting a resource link by id.`,
            error as Error,
          ),
      ),
    )();
  }

  public async findById(resourceLinkId: string) {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiResourceLinks.findFirst({
            ...ltiResourceLinksMapper.requiredQueryConfig,
            where: eq(ltiResourceLinks.id, resourceLinkId),
          }),
        (error) => {
          return new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding resource link by id.`,
              error as Error,
            ),
          });
        },
      ),
      te.chainW(
        te.fromNullable(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new ResourceLinkNotFoundError(resourceLinkId),
            subject: LtiResourceLink.name,
          }),
        ),
      ),
      te.map(ltiResourceLinksMapper.fromRow),
    )();
  }
}
