import { either } from "fp-ts";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiContextsRepository } from "$/core/repositories/contexts.repository.js";

export class InMemoryLtiContextsRepository<CCtype = never>
  implements LtiContextsRepository<CCtype>
{
  public contexts: Context<CCtype>[] = [];

  public async findById(contextId: string) {
    const context = this.contexts.find((context) => context.id === contextId);
    if (!context) {
      const error = new LtiRepositoryError({
        type: "NotFound",
        subject: Context.name,
        cause: undefined,
      });

      return either.left(error);
    }

    return either.right(context);
  }
}
