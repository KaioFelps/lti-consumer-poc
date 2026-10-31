import { LtilibError } from "./ltilib.error.js";

export abstract class InvalidArgumentError<
  Field extends string,
  Code extends string,
> extends LtilibError {
  public constructor(
    public readonly field: Field,
    public readonly reason: Code,
  ) {
    super(422, reason);
  }
}
