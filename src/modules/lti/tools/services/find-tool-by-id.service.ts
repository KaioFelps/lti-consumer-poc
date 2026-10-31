import { Inject, Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { type IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { type LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiTool } from "../entities/lti-tool.entity.js";
import { type ToolNotFoundError } from "../errors/tool-not-found.error.js";
import { LtiToolsRepository } from "../lti-tools.repository.js";

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
      either.mapLeft((error) => (error as LtiRepositoryError<PossibleErrors>).cause),
    );
  }
}
