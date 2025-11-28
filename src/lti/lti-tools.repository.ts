import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiTool } from "./lti-tool";

export abstract class LTIToolsRepository {
  public abstract findManyTools(): Promise<
    Either<IrrecoverableError, LtiTool[]>
  >;

  public abstract findToolById(
    id: string,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiTool>>;

  public abstract upsertTool(
    tool: LtiTool,
  ): Promise<Either<IrrecoverableError, LtiTool>>;

  public abstract deleteToolById(
    id: string,
  ): Promise<Either<IrrecoverableError, void>>;
}
