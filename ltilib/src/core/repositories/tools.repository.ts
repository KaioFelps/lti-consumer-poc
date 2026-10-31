import { Either } from "fp-ts/lib/Either.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiRepositoryError } from "../errors/repository.error.js";
import { LtiTool } from "../tool.js";

export abstract class LtiToolsRepository {
  public abstract findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<LtiRepositoryError, LtiTool[]>>;

  public abstract findToolById(id: string): Promise<Either<LtiRepositoryError, LtiTool>>;
}
