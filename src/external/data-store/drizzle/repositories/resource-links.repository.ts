import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { ltiResourceLinks, ltiToolDeployments } from "drizzle/schema";
import { and, eq, inArray, SQLWrapper } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceLinkNotFoundError } from "@/lti/resource-links/errors/resource-link-not-found.error";
import { LtiResourceLinksRepository } from "@/lti/resource-links/resource-links.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { FindManyParams } from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { DrizzleClient } from "../client";
import ltiResourceLinksMapper from "../mappers/lti-resource-links.mapper";

@Injectable()
export class DrizzleLtiResourceLinksRepository extends LtiResourceLinksRepository {
  @Inject()
  private drizzle: DrizzleClient;

  public async findMany({
    withDeploymentId,
    withToolId,
    withContextId,
  }: FindManyParams = {}): Promise<
    Either<LtiRepositoryError, LtiResourceLink[]>
  > {
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

      rootFilters.push(
        inArray(ltiResourceLinks.deploymentId, deploymentsFromTool),
      );
    }

    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiResourceLinks.findMany({
            ...ltiResourceLinksMapper.requiredQueryConfig,
            where: rootFilters.length > 0 ? and(...rootFilters) : undefined,
          }),
        (error: Error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding many resource links from database.`,
              error,
            ),
          }),
      ),
      te.map((rows) => rows.map(ltiResourceLinksMapper.fromRow)),
    )();
  }

  public async create(
    resourceLink: LtiResourceLink,
  ): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        async () => {
          await this.drizzle
            .getClient()
            .insert(ltiResourceLinks)
            .values(ltiResourceLinksMapper.intoRow(resourceLink));
        },
        (error: Error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when creating resource link.`,
            error,
          ),
      ),
    )();
  }

  public async deleteById(
    resourceLinkId: UUID,
  ): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        async () => {
          await this.drizzle
            .getClient()
            .delete(ltiResourceLinks)
            .where(eq(ltiResourceLinks.id, resourceLinkId.toString()));
        },
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiResourceLinksRepository.name} when deleting a resource link by id.`,
            error,
          ),
      ),
    )();
  }

  public async findById(
    resourceLinkId: string,
  ): Promise<Either<LtiRepositoryError, LtiResourceLink>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiResourceLinks.findFirst({
            ...ltiResourceLinksMapper.requiredQueryConfig,
            where: eq(ltiResourceLinks.id, resourceLinkId),
          }),
        (error: Error) => {
          return new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding resource link by id.`,
              error,
            ),
          });
        },
      ),
      te.chainW(
        te.fromNullable(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new ResourceLinkNotFoundError(resourceLinkId),
          }),
        ),
      ),
      te.map(ltiResourceLinksMapper.fromRow),
    )();
  }
}
