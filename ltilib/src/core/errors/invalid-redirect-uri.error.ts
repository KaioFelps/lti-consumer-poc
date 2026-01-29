export class InvalidRedirectUriError extends Error {
  public constructor(
    message: string,
    public readonly invalidRedirectUri: string,
  ) {
    super(message);
  }
}
