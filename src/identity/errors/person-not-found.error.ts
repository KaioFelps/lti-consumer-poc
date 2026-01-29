import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class PersonNotFoundError extends ResourceNotFoundError {
  public constructor(personId: string) {
    super({
      errorMessageIdentifier:
        "identity:people-repository:find-by-id:resource-not-found",
      messageParams: { personId },
    });
  }
}
