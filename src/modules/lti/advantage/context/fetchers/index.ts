import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type.js";
import { Context } from "$/core/context.js";
import { ContextNotFoundError } from "../../errors/context-not-found.error.js";
import { LtiContextAdapter } from "../adapters/index.js";

export const CONTEXT_FETCHERS = Symbol("context_fetchers");

/**
 * A `ContextFetcher` is a resolver that is responsible for fetching and extracting
 * a context from some instance of the concrete `type` it's specialized in.
 *
 * E.g.: a `CourseContextFetcher` knows how to find a course and transform it into
 * a valid {@link Context `Context`} instance — usually with the help some
 * {@link LtiContextAdapter `LtiContextAdapter`}.
 */
export abstract class ContextFetcher {
  /**
   * @param type the specialized type of context this `ContextFetcher` is specialized in.
   */
  public constructor(public readonly type: ContextConcreteType) {}

  /**
   * Finds the concrete entity of type {@link type `ContextFetcher.type`} and ID `id`.
   * The entity must furthermore be transformed into a {@link Context `Context`}
   * instance.
   *
   * @param id the ID of the concrete entity that will become the {@link Context `Context`}.
   */
  public abstract findById(
    id: string,
  ): Promise<Either<IrrecoverableError | ContextNotFoundError, Context<ContextConcreteType>>>;
}
