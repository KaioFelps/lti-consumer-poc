import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { ExternalLtiResource } from "../external-resource";

export abstract class ExternalLtiResourcesRepository {
  public abstract findById(
    id: string,
  ): Promise<Either<LtiRepositoryError, ExternalLtiResource>>;
}
