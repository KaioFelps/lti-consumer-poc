import { Inject, Injectable } from "@nestjs/common";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { ResourceLinkNotFoundError } from "../errors/resource-link-not-found.error";
import { LtiResourceLinksRepository } from "../resource-links.repository";

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
        (error) =>
          error as LtiRepositoryError<
            IrrecoverableError | ResourceLinkNotFoundError
          >,
      ),
    );
  }
}
