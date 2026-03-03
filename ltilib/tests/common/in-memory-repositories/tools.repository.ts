import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiToolsRepository } from "$/core/repositories/tools.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";
import { InMemoryLtiResourceLinksRepository } from "./resource-links.repository";

export class InMemoryToolsRepository implements LtiToolsRepository {
  public tools: ToolRecord[] = [];

  public constructor(
    public resourceLinksRepo: InMemoryLtiResourceLinksRepository = new InMemoryLtiResourceLinksRepository(),
  ) {}

  public async findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<LtiRepositoryError, ToolRecord[]>> {
    const resourceLinks = this.resourceLinksRepo.resourceLinks.filter((link) =>
      resourceLinksIds.includes(link.id),
    );

    const tools = this.tools.filter((tool) => {
      resourceLinks.some((link) => link.toolId === tool.id);
    });

    return e.right(tools);
  }

  public async findToolById(id: string): Promise<Either<LtiRepositoryError, ToolRecord>> {
    const tool = this.tools.find((tool) => tool.id === id);

    if (tool) return e.right(tool);

    const error = new LtiRepositoryError({
      type: "NotFound",
      subject: ToolRecord.name,
      cause: undefined,
    });

    return e.left(error);
  }
}
