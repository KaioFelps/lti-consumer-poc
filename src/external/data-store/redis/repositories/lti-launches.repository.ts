import { Inject, Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LaunchNotFoundError } from "@/modules/lti/resource-links/errors/launch-not-found.error";
import { NoValidLaunchFoundError } from "@/modules/lti/resource-links/errors/no-valid-launch-found.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLaunchData } from "$/core/launch-data";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { Redis } from "../client";
import ltiLaunchMapper from "../mappers/lti-launch.mapper";

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
        (error: Error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${RedisLtiLaunchesRepository.name} on ` +
                `saving launch data (${JSON.stringify(launch)}).`,
              error,
            ),
          }),
      ),
    )();
  }
  public async findById(
    launchId: string,
  ): Promise<
    Either<
      LtiRepositoryError<
        IrrecoverableError | LaunchNotFoundError | NoValidLaunchFoundError
      >,
      LtiLaunchData
    >
  > {
    const key = this.resolveKey(launchId);
    return await pipe(
      te.tryCatch(
        () => this.redis.client.json.get(key),
        (error: Error) =>
          new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${RedisLtiLaunchesRepository.name} ` +
                `on finding launch data by id "${launchId}".`,
              error,
            ),
          }),
      ),
      te.chainW(
        te.fromNullable(
          new LtiRepositoryError({
            type: "NotFound",
            cause: new LaunchNotFoundError(launchId),
          }),
        ),
      ),
      te.map((data) => ltiLaunchMapper.fromPayload(data)),
      te.chain(
        te.fromOption(
          () =>
            new LtiRepositoryError({
              type: "NotFound",
              cause: new NoValidLaunchFoundError(launchId),
            }),
        ),
      ),
      (a) => a,
    )();
  }

  private resolveKey(launchId: string): string {
    return `lti:launch:${launchId}`;
  }
}
