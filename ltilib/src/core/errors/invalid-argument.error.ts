import { LtilibError } from "./bases/ltilib.error";

export class InvalidArgumentError<Field extends string, Code extends string> extends LtilibError {
  public constructor(
    public readonly field: Field,
    public readonly reason: Code,
  ) {
    super(422, reason);
  }
}
