import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";

export abstract class LtiResourceLinksRepository<ExternalError> {
  public abstract findMany(): Promise<Either<ExternalError, LtiResourceLink[]>>;
}
