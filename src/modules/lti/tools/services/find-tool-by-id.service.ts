import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiTool } from "../entities/lti-tool.entity";
import { ToolNotFoundError } from "../errors/tool-not-found.error";
import { LtiToolsRepository } from "../lti-tools.repository";

type Params = {
  id: UUID;
};

type PossibleErrors = IrrecoverableError | ToolNotFoundError;

@Injectable()
export class FindToolByIdService {
  @Inject()
  private readonly toolsRepo: LtiToolsRepository;

  public async exec({ id }: Params): Promise<Either<PossibleErrors, LtiTool>> {
    return pipe(
      await this.toolsRepo.findToolById(id.toString()),
      either.map((record) => new LtiTool(record)),
      either.mapLeft((error: LtiRepositoryError<PossibleErrors>) => error.cause),
    );
  }
}
