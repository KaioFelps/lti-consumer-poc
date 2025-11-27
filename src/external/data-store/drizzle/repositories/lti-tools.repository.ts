import { Injectable } from "@nestjs/common";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiTool } from "@/lti/lti-tool";
import { LTIToolsRepository } from "@/lti/lti-tools.repository";

@Injectable()
export class DrizzleLtiToolsRepository extends LTIToolsRepository {
  public findManyTools(): Promise<Either<IrrecoverableError, LtiTool[]>> {
    throw new Error("findManyTools not implemented.");
  }
  public findToolById: Promise<
    Either<IrrecoverableError | ResourceNotFoundError, LtiTool>
  >;
  public upsertTool(
    _tool: LtiTool,
  ): Promise<Either<IrrecoverableError, LtiTool>> {
    throw new Error("upsertTool not implemented.");
  }
}
