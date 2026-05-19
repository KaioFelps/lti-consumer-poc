import type { UUID } from "common/src/types/uuid";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class ExternalAssignmentNotFoundError extends ResourceNotFoundError {
  public constructor(externalAssignmentId: UUID) {
    super({
      errorMessageIdentifier: "lti:ags:show-assignment:errors:external-assignment-not-found",
      messageParams: { id: externalAssignmentId.toString() },
    });
  }
}
