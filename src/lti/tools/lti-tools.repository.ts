import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiToolsRepository as BaseLtiToolsRepository } from "$/core/repositories/tools.repository";
import { LtiTool } from "./entities/lti-tool.entity";
import { LtiToolPreview } from "./entities/lti-tool-preview.entity";

export abstract class LtiToolsRepository extends BaseLtiToolsRepository {
  public abstract findManyTools(): Promise<
    Either<IrrecoverableError, LtiTool[]>
  >;

  public abstract upsertTool(
    tool: LtiTool,
  ): Promise<Either<IrrecoverableError, LtiTool>>;

  public abstract deleteToolById(
    id: string,
  ): Promise<Either<IrrecoverableError, void>>;

  public abstract findManyPreviews(): Promise<
    Either<IrrecoverableError, LtiToolPreview[]>
  >;
}
