import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiResourceLinksRepository as BaseLtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";

const REPOSITORY_MESSAGES = {
  findById: {
    resourceNotFound: "lti:resource-links:find-by-id:resource-not-found",
  },
} as const;

export abstract class LtiResourceLinksRepository extends BaseLtiResourceLinksRepository {
  /**
   * Message strings identifiers for possible errors originated from methods within
   * this repository. Implementations inherit these messages and therefore does not
   * need to write hard-coded strings identifiers, avoiding spelling errors or
   * inconsistency.
   */
  protected messages = REPOSITORY_MESSAGES;

  public abstract create(
    resourceLink: LtiResourceLink,
  ): Promise<Either<IrrecoverableError, void>>;

  public abstract deleteById(
    resourceLinkId: UUID,
  ): Promise<Either<IrrecoverableError, void>>;
}
