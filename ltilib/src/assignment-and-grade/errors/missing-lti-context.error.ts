import { LtilibError } from "$/core/errors/bases/ltilib.error";

export class MissingLtiContextError extends LtilibError {
  public constructor() {
    super(500, "This LTI service requires a valid LTI Context, but none was provided.");
  }
}
