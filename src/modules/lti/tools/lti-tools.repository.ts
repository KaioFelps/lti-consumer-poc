import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { LtiToolsRepository as BaseLtiToolsRepository } from "$/core/repositories/tools.repository.js";
import { LtiTool } from "./entities/lti-tool.entity.js";
import { LtiToolPreview } from "./entities/lti-tool-preview.entity.js";

export abstract class LtiToolsRepository extends BaseLtiToolsRepository {
  public abstract findManyTools(): Promise<Either<IrrecoverableError, LtiTool[]>>;

  public abstract upsertTool(tool: LtiTool): Promise<Either<IrrecoverableError, LtiTool>>;

  public abstract deleteToolById(id: string): Promise<Either<IrrecoverableError, void>>;

  public abstract findManyPreviews(): Promise<Either<IrrecoverableError, LtiToolPreview[]>>;
}
