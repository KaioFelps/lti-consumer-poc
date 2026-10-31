import { Either } from "fp-ts/lib/Either.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { ExternalLtiResource } from "../external-resource.js";

export abstract class ExternalLtiResourcesRepository {
  public abstract findOrCreateByExternalId(
    externalResourceId: string,
    toolId: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>>;
}
