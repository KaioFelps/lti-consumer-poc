import { DocumentTarget } from "../enums/document-target";
import { IntoLtiClaim } from "../serialization";

export class LaunchPresentationClaim implements IntoLtiClaim {
  private constructor(
    /**
     * The kind of browser or frame from which the user started the launch in the platform.
     */
    public readonly documentTarget?: DocumentTarget,
    /**
     * The width of the frame in which the launch's response content will be displayed.
     */
    public readonly width?: number,
    /**
     * The heigh of the frame in which the launch's response content will be displayed.
     */
    public readonly height?: number,
    /**
     * If included, the tool may redirect the user to this URL when it finishes some
     * activity or if some error occurs.
     *
     * If included, the platform must be prepared to treat the redirect by parsing an request
     * with `ReturnUrlRedirectionDetails` on the endpoint that handles this URL.
     */
    public readonly returnUrl?: URL,
    /**
     * Country, language and variant represented by a valid BCP47 tag (specified in
     * [RFC5646](https://datatracker.ietf.org/doc/html/rfc5646)).
     */
    public readonly locale?: string,
  ) {}

  intoLtiClaim(): object {
    return {
      document_target: this.documentTarget,
      height: this.height,
      width: this.width,
      return_url: this.returnUrl,
      locale: this.locale,
    };
  }
}
