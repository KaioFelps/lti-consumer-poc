import type { UUID } from "common/src/types/uuid.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";

export class ExternalAssignmentNotFoundError extends ResourceNotFoundError {
  public constructor(externalAssignmentId: UUID) {
    super({
      errorMessageIdentifier: "lti:ags:show-assignment:errors:external-assignment-not-found",
      messageParams: { id: externalAssignmentId.toString() },
    });
  }
}
