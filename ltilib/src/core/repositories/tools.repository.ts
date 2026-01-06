import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";

export abstract class LtiToolsRepository<ExternalError> {
  public abstract findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<ExternalError, ToolRecord[]>>;
}
