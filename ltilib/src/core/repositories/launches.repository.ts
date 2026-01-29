import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "../errors/repository.error";
import { LtiLaunchData } from "../launch-data";

export abstract class LtiLaunchesRepository {
  public abstract save(
    launch: LtiLaunchData,
    timeToLiveSeconds: number,
  ): Promise<Either<LtiRepositoryError, void>>;

  public abstract findById(
    launchId: string,
  ): Promise<Either<LtiRepositoryError, LtiLaunchData>>;
}
