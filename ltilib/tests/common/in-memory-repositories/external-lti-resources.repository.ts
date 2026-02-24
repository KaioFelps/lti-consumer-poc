import { either, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";

export class InMemoryExternalLtiResourcesRepository implements ExternalLtiResourcesRepository {
  public externalLtiResources: ExternalLtiResource[] = [];

  public async findById(
    resourceId: string,
    toolId: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>> {
    return pipe(
      this.externalLtiResources.find(
        (resource) => resource.externalToolResourceId === resourceId && resource.tool.id === toolId,
      ),
      o.fromNullable,
      o.match(
        () =>
          either.left(
            new LtiRepositoryError({
              type: "NotFound",
              cause: undefined,
              subject: ExternalLtiResource.name,
            }),
          ),
        (resource) => either.right(resource),
      ),
    );
  }
}
