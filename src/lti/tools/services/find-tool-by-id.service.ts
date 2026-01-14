import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiTool } from "../entities/lti-tool.entity";
import { LtiToolsRepository } from "../lti-tools.repository";

type Params = {
  id: UUID;
};

type PossibleErrors = IrrecoverableError | ResourceNotFoundError;

@Injectable()
export class FindToolByIdService {
  @Inject()
  private readonly toolsRepo: LtiToolsRepository;

  public async exec({ id }: Params): Promise<Either<PossibleErrors, LtiTool>> {
    return await this.toolsRepo.findToolById(id.toString());
  }
}
