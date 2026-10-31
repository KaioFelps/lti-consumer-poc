import { Either } from "fp-ts/lib/Either.js";
import { LtiRepositoryError } from "../errors/repository.error.js";
import { LtiLaunchData } from "../launch-data.js";

export abstract class LtiLaunchesRepository {
  public abstract save(
    launch: LtiLaunchData,
    timeToLiveSeconds: number,
  ): Promise<Either<LtiRepositoryError, void>>;

  public abstract findById(launchId: string): Promise<Either<LtiRepositoryError, LtiLaunchData>>;
}
