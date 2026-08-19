import { generateUUID } from "common/src/types/uuid";
import { either, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { ExternalLtiResourcesRepository } from "$/advantage/repositories/resources.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { InMemoryToolsRepository } from "./tools.repository";

export class InMemoryExternalLtiResourcesRepository implements ExternalLtiResourcesRepository {
  public externalLtiResources: ExternalLtiResource[] = [];
  public constructor(
    public toolsRepository: InMemoryToolsRepository = new InMemoryToolsRepository(),
  ) {}

  public async findByExternalId(
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

  public async findOrCreateByExternalId(
    resourceId: string,
    toolId: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>> {
    let resource = this.externalLtiResources.find(
      (resource) => resource.externalToolResourceId === resourceId && resource.tool.id === toolId,
    );

    if (!resource) {
      resource = ExternalLtiResource.create({
        tool: this.toolsRepository.tools.find((tool) => tool.id === toolId)!,
        externalToolResourceId: resourceId,
        localResourceId: generateUUID(),
      });

      this.externalLtiResources.push(resource);
    }

    return either.right(resource);
  }
}
