export interface ILtilibError {
  httpStatusCode: number;
  message: string | undefined;
}

export abstract class LtilibError extends Error implements ILtilibError {
  public constructor(
    public readonly httpStatusCode: number,
    message?: string,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions);
  }
}
