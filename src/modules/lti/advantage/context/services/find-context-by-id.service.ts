import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiContextsRepository } from "../../repositories/lti-contexts.repository";

type Params = {
  contextComposedId: string;
};

@Injectable()
export class FindContextByIdService {
  public constructor(private readonly contextsRepo: LtiContextsRepository) {}

  public exec({ contextComposedId }: Params) {
    return pipe(
      () => this.contextsRepo.findById(contextComposedId),
      te.mapError((error) => {
        return error.cause;
      }),
    )();
  }
}
