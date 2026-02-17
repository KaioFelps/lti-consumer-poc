import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiResourceLinksRepository as BaseLtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";

export abstract class LtiResourceLinksRepository extends BaseLtiResourceLinksRepository {
  public abstract create(resourceLink: LtiResourceLink): Promise<Either<IrrecoverableError, void>>;

  public abstract deleteById(resourceLinkId: UUID): Promise<Either<IrrecoverableError, void>>;
}
