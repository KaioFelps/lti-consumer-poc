import { Inject, Injectable } from "@nestjs/common";
import { option, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ContextNotFoundError } from "../../errors/context-not-found.error";
import { unmountContextId } from "..";
import { CONTEXT_FETCHERS, ContextFetcher } from "../fetchers";

type Params = {
  contextComposedId: string;
};

@Injectable()
export class FindContextByIdService {
  public constructor(
    @Inject(CONTEXT_FETCHERS) private readonly contextFetchers: ContextFetcher[],
  ) {}

  public exec({ contextComposedId }: Params) {
    return pipe(
      unmountContextId(contextComposedId),
      te.fromEither,
      te.chainW(({ concreteEntityId, concreteType }) =>
        pipe(
          this.contextFetchers.find((fetcher) => fetcher.type === concreteType),
          option.fromNullable,
          te.fromOption(() => new ContextNotFoundError(concreteEntityId, concreteType)),
          te.chainW((fetcher) => () => fetcher.findById(concreteEntityId)),
        ),
      ),
    )();
  }
}
