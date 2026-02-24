import { either as e, option as o } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import {
  FindManyParams,
  LtiResourceLinksRepository,
} from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";

export class InMemoryLtiResourceLinksRepository implements LtiResourceLinksRepository {
  public resourceLinks: LtiResourceLink[] = [];

  public async findMany({
    withContextId,
    withDeploymentId,
    withToolId,
  }: FindManyParams = {}): Promise<Either<LtiRepositoryError, LtiResourceLink[]>> {
    const links = this.resourceLinks.filter((link) => {
      if (withContextId && link.contextId !== withContextId) return false;
      if (withDeploymentId && link.deploymentId !== withDeploymentId) return false;
      if (withToolId && link.toolId !== withToolId) return false;
      return true;
    });

    return e.right(links);
  }

  public async findById(
    resourceLinkId: string,
  ): Promise<Either<LtiRepositoryError, LtiResourceLink>> {
    return pipe(
      this.resourceLinks.find((link) => link.id === resourceLinkId),
      o.fromNullable,
      o.match(
        () =>
          e.left(
            new LtiRepositoryError({
              type: "NotFound",
              cause: undefined,
              subject: LtiResourceLink.name,
            }),
          ),
        (link) => e.right(link),
      ),
    );
  }
}
