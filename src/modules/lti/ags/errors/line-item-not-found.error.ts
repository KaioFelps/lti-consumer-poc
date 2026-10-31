import type { UUID } from "common/src/types/uuid.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";

export class LineItemNotFoundError extends ResourceNotFoundError {
  public constructor(lineItemId: UUID) {
    super({
      errorMessageIdentifier: "lti:ags:assignment-grades:errors:line-item-not-found",
      messageParams: { id: lineItemId.toString() },
    });
  }
}
