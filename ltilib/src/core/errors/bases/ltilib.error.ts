export interface ILtilibError {
  httpStatusCode: number;
  message: string | undefined;
}

export abstract class LtilibError extends Error implements ILtilibError {
  public constructor(
    protected _httpStatusCode: number,
    message?: string,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions);
  }

  public get httpStatusCode() {
    return this._httpStatusCode;
  }
}
