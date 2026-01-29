import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiRepositoryError } from "../errors/repository.error";

export interface FindManyParams {
  withToolId?: string;
  withDeploymentId?: string;
  withContextId?: string;
}

export interface FindManyFromPlacementsParams {
  placements: string[];
  acceptNullPlacements: boolean;
}

export abstract class LtiResourceLinksRepository {
  public abstract findMany(
    params?: FindManyParams,
  ): Promise<Either<LtiRepositoryError, LtiResourceLink[]>>;

  public abstract findById(
    resourceLinkId: string,
  ): Promise<Either<LtiRepositoryError, LtiResourceLink>>;
}
