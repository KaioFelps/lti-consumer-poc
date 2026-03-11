import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiRepositoryError } from "../errors/repository.error";
import { LtiTool } from "../tool";

export abstract class LtiToolsRepository {
  public abstract findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<LtiRepositoryError, LtiTool[]>>;

  public abstract findToolById(id: string): Promise<Either<LtiRepositoryError, LtiTool>>;
}
