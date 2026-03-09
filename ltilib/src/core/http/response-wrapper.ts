export class HttpResponseWrapper<RawContent = undefined, PresentedContent = object> {
  public constructor(
    public readonly content: Readonly<PresentedContent>,
    public readonly httpStatusCode: Readonly<number>,
    public readonly rawContent: Readonly<RawContent>,
    private _headers: Record<string, string> = {},
  ) {}

  public get headers(): Readonly<Record<string, string>> {
    return this._headers;
  }

  public appendHeader(key: string, value: string) {
    this._headers[key] = value;
  }
}
