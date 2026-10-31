import { Inject, Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { LaunchNotFoundError } from "@/modules/lti/resource-links/errors/launch-not-found.error.js";
import { NoValidLaunchFoundError } from "@/modules/lti/resource-links/errors/no-valid-launch-found.error.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiLaunchData } from "$/core/launch-data.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";
import { Redis } from "../client.js";
import ltiLaunchMapper from "../mappers/lti-launch.mapper.js";

@Injectable()
export class RedisLtiLaunchesRepository extends LtiLaunchesRepository {
  @Inject()
  private readonly redis: Redis;

  public async save(
    launch: LtiLaunchData,
    timeToLiveSeconds: number,
  ): Promise<Either<LtiRepositoryError, void>> {
    return await pipe(
      te.tryCatch(
        async () => {
          const multi = this.redis.client.multi();
          const key = this.resolveKey(launch.id.toString());

          multi.json.set(key, ".", ltiLaunchMapper.intoPayload(launch));

          multi.expire(key, timeToLiveSeconds);
          await multi.exec();
        },
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${RedisLtiLaunchesRepository.name} on ` +
                `saving launch data (${JSON.stringify(launch)}).`,
              error as Error,
            ),
          }),
      ),
    )();
  }
  public async findById(
    launchId: string,
  ): Promise<
    Either<
      LtiRepositoryError<IrrecoverableError | LaunchNotFoundError | NoValidLaunchFoundError>,
      LtiLaunchData
    >
  > {
    const key = this.resolveKey(launchId);
    return await pipe(
      te.tryCatch(
        () => this.redis.client.json.get(key),
        (error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${RedisLtiLaunchesRepository.name} ` +
                `on finding launch data by id "${launchId}".`,
              error as Error,
            ),
          }),
      ),
      te.chainW(
        te.fromNullable(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new LaunchNotFoundError(launchId),
            subject: LtiLaunchData.name,
          }),
        ),
      ),
      te.map((data) => ltiLaunchMapper.fromPayload(data)),
      te.chainW(
        te.fromOption(
          () =>
            new LtiRepositoryError({
              type: "NotFound",
              cause: new NoValidLaunchFoundError(launchId),
              subject: LtiLaunchData.name,
            }),
        ),
      ),
    )();
  }

  private resolveKey(launchId: string): string {
    return `lti:launch:${launchId}`;
  }
}
