import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiLaunchData } from "$/core/launch-data.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";

export class InMemoryLaunchesRepository implements LtiLaunchesRepository {
  public launches: { data: LtiLaunchData; ttl: number; savedAt: Date }[] = [];

  public async save(
    launch: LtiLaunchData,
    timeToLiveSeconds: number,
  ): Promise<Either<LtiRepositoryError, void>> {
    this.launches.push({ data: launch, ttl: timeToLiveSeconds, savedAt: new Date() });
    return e.right(undefined);
  }

  public async findById(launchId: string): Promise<Either<LtiRepositoryError, LtiLaunchData>> {
    const launch = this.launches.find(({ data }) => data.id === launchId);

    const notFoundError = new LtiRepositoryError({
      type: "NotFound",
      subject: LtiLaunchData.name,
      cause: undefined,
    });

    if (!launch) return e.left(notFoundError);

    const hasExpired = new Date() > new Date(launch.savedAt.getTime() + launch.ttl * 1000);

    if (hasExpired) return e.left(notFoundError);

    return e.right(launch.data);
  }
}
