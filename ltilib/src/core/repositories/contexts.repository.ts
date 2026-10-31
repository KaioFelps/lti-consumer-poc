import { Either } from "fp-ts/lib/Either.js";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";

export abstract class LtiContextsRepository<CustomContextType = never> {
  /**
   * Finds a `Context` by ID. It's up to the platform to map this identifier
   * to some concrete context and obtain a ltilib {@link Context `Context`}.
   */
  public abstract findById(
    contextId: string,
  ): Promise<Either<LtiRepositoryError, Context<CustomContextType>>>;
}
