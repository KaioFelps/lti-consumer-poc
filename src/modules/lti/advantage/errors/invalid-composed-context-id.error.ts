import { BadRequestError } from "@/core/errors/bad-request.error.js";

export class InvalidComposedContextIdError extends BadRequestError {
  public constructor(reason: "malformed" | "unknown") {
    super({
      errorMessageIdentifier: "lti:advantage:contexts:errors:invalid-composed-context-id",
      messageParams: {
        reason,
      },
    });
  }
}
