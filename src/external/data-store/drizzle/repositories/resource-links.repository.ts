import { Inject, Injectable } from "@nestjs/common";
import { ltiResourceLinks, ltiToolDeployments } from "drizzle/schema";
import { and, eq, inArray, SQLWrapper } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiResourceLinksRepository } from "@/lti/resource-links/resource-links.repository";
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
    Either<IrrecoverableError, LtiResourceLink[]>
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
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding many resource links from database.`,
            error,
          ),
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
}
