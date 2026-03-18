export class HttpResponseWrapper<RawContent = undefined, PresentedContent = object> {
  public readonly headers: Readonly<Headers>;
  public constructor(
    public readonly content: Readonly<PresentedContent>,
    public readonly httpStatusCode: Readonly<number>,
    public readonly rawContent: Readonly<RawContent>,
    headers: Record<string, string> = {},
  ) {
    this.headers = new Headers(headers);
  }
}
