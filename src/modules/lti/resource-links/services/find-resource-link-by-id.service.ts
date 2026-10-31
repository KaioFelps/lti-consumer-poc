import { Inject, Injectable } from "@nestjs/common";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { ResourceLinkNotFoundError } from "../errors/resource-link-not-found.error.js";
import { LtiResourceLinksRepository } from "../resource-links.repository.js";

type Params = {
  resourceLinkId: string;
};

@Injectable()
export class findResourceLinkByIdService {
  @Inject()
  private readonly resourceLinksRepo: LtiResourceLinksRepository;

  public async exec({ resourceLinkId }: Params) {
    return pipe(
      await this.resourceLinksRepo.findById(resourceLinkId),
      e.mapLeft(
        (error) => error as LtiRepositoryError<IrrecoverableError | ResourceLinkNotFoundError>,
      ),
    );
  }
}
