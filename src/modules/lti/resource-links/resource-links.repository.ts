import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import {
  LtiResourceLinksRepository as BaseLtiResourceLinksRepository,
  FindManyParams,
} from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { ResourceLinkNotFoundError } from "./errors/resource-link-not-found.error";

export abstract class LtiResourceLinksRepository extends BaseLtiResourceLinksRepository {
  public abstract findMany(
    params?: FindManyParams,
  ): Promise<Either<LtiRepositoryError<IrrecoverableError>, LtiResourceLink[]>>;

  public abstract findById(
    resourceLinkId: string,
  ): Promise<
    Either<LtiRepositoryError<ResourceLinkNotFoundError | IrrecoverableError>, LtiResourceLink>
  >;

  public abstract create(resourceLink: LtiResourceLink): Promise<Either<IrrecoverableError, void>>;

  public abstract deleteById(resourceLinkId: UUID): Promise<Either<IrrecoverableError, void>>;
}
