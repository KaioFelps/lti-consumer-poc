import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";
import { LtiRepositoryError } from "../errors/repository.error";

export abstract class LtiToolsRepository {
  public abstract findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<LtiRepositoryError, ToolRecord[]>>;

  public abstract findToolById(id: string): Promise<Either<LtiRepositoryError, ToolRecord>>;
}
