export abstract class LtiError extends Error {
  public constructor(
    public readonly httpCode: number,
    message?: string,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions);
  }
}
