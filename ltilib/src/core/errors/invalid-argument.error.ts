export class InvalidArgumentError<
  Field extends string,
  Code extends string,
> extends Error {
  public constructor(
    public readonly field: Field,
    public readonly reason: Code,
  ) {
    super(reason);
  }
}
