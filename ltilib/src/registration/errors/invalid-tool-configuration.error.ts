export class InvalidToolConfigurationError {
  public constructor(public errors: Record<string, string>) {}
}
