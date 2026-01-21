import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";

export interface FindManyParams {
  withToolId?: string;
  withDeploymentId?: string;
  withContextId?: string;
}

export interface FindManyFromPlacementsParams {
  placements: string[];
  acceptNullPlacements: boolean;
}

export abstract class LtiResourceLinksRepository<ExternalError> {
  public abstract findMany(
    params?: FindManyParams,
  ): Promise<Either<ExternalError, LtiResourceLink[]>>;
}
