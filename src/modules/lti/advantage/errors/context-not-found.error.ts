import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class ContextNotFoundError extends ResourceNotFoundError {
  public constructor(contextConcreteId: string, contextType: string | string[]) {
    super({
      errorMessageIdentifier: "lti:advantage:contexts:errors:not-found",
      messageParams: { contextId: contextConcreteId, contextType },
    });
  }
}
