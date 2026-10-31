import { Inject, Injectable } from "@nestjs/common";
import { concreteContextTypeEnum, ltiContexts } from "drizzle/schema.js";
import { InferEnum } from "drizzle-orm";
import { option, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";
import {
  CONTEXT_FETCHERS,
  ContextFetcher,
} from "@/modules/lti/advantage/context/fetchers/index.js";
import { unmountContextId } from "@/modules/lti/advantage/context.js";
import { ContextNotFoundError } from "@/modules/lti/advantage/errors/context-not-found.error.js";
import {
  CreateParams,
  LtiContextsRepository,
} from "@/modules/lti/advantage/repositories/lti-contexts.repository.js";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { DrizzleClient } from "../client.js";
import { DrizzleTransactionManager } from "../transaction-manager.js";

@Injectable()
export class DrizzleLtiContextsRepository extends LtiContextsRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly txManager: DrizzleTransactionManager,
    @Inject(CONTEXT_FETCHERS) private readonly contextFetchers: ContextFetcher[],
  ) {
    super();
  }

  public create({
    concreteId,
    concreteType,
    parent,
  }: CreateParams): Promise<Either<IrrecoverableError, void>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.insert(ltiContexts).values({
            concreteContextId: concreteId,
            concreteContextType: concreteType as InferEnum<typeof concreteContextTypeEnum>,
            parentContextId: parent?.concreteId,
            parentContextType: parent?.concreteType,
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiContextsRepository.name} when saving context.`,
            error as Error,
          ),
      ),
      te.map(() => {}),
    )();
  }

  public findById(contextComposedId: string) {
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
      te.mapLeft((error) => {
        if (error instanceof ResourceNotFoundError) {
          return new LtiRepositoryError({
            type: "NotFound",
            subject: Context.name,
            cause: error,
          });
        }

        return new LtiRepositoryError({ type: "ExternalError", cause: error });
      }),
    )();
  }
}
