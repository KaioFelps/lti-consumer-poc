export class HttpResponseWrapper<RawContent = undefined, PresentedContent = object> {
  public constructor(
    public readonly content: PresentedContent,
    public readonly httpStatusCode: number,
    public readonly rawContent: RawContent,
    public headers: Record<string, string> = {},
  ) {}

  public appendHeader(key: string, value: string) {
    this.headers[key] = value;
  }
}
