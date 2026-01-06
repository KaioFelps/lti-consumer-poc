import { Inject, Injectable } from "@nestjs/common";
import { taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { DrizzleClient } from "../client";
import ltiResourceLinksMapper from "../mappers/lti-resource-links.mapper";

@Injectable()
export class DrizzleLtiResourceLinksRepository extends LtiResourceLinksRepository<IrrecoverableError> {
  @Inject()
  private drizzle: DrizzleClient;

  public async findMany(): Promise<
    Either<IrrecoverableError, LtiResourceLink[]>
  > {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.ltiResourceLinks.findMany(
              ltiResourceLinksMapper.requiredQueryConfig,
            ),
        (error: Error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiResourceLinksRepository.name} when finding many resource links from database.`,
            error,
          ),
      ),
      taskEither.map((rows) => rows.map(ltiResourceLinksMapper.fromRow)),
    )();
  }
}
