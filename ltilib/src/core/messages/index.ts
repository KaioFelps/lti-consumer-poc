import { IntoLtiClaim } from "$/claims/serialization";

export namespace MessageRequests {
  export enum DocumentTarget {
    Frame = "frame",
    IFrame = "iframe",
    Window = "window",
  }

  export interface IPresentation {
    /**
     * The kind of browser or frame from which the user started the launch in the platform.
     */
    documentTarget?: DocumentTarget;
    /**
     * The width of the frame in which the launch's response content will be displayed.
     */
    width?: number;
    /**
     * The heigh of the frame in which the launch's response content will be displayed.
     */
    height?: number;
    /**
     * If included, the tool may redirect the user to this URL when it finishes some
     * activity or if some error occurs.
     *
     * If included, the platform must be prepared to treat the redirect by parsing an request
     * with `ReturnUrlRedirectionDetails` on the endpoint that handles this URL.
     */
    returnUrl?: URL;
    /**
     * Country, language and variant represented by a valid BCP47 tag (specified in
     * [RFC5646](https://datatracker.ietf.org/doc/html/rfc5646)).
     */
    locale?: string;
  }

  /**
   * A collection of metadata about how the platform expects the message to displayed.
   *
   * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#launch-presentation-claim Launch Presentation Claim}
   */
  export class Presentation implements IntoLtiClaim, IPresentation {
    private constructor(
      public readonly documentTarget?: DocumentTarget,
      public readonly width?: number,
      public readonly height?: number,
      public readonly returnUrl?: URL,
      public readonly locale?: string,
    ) {}

    public static create(args: IPresentation) {
      return new Presentation(
        args.documentTarget,
        args.width,
        args.height,
        args.returnUrl,
        args.locale,
      );
    }

    intoLtiClaim(): object {
      return {
        document_target: this.documentTarget,
        height: this.height,
        width: this.width,
        return_url: this.returnUrl?.toString(),
        locale: this.locale,
      };
    }
  }

  type ValidClaimValue =
    | Array<ValidClaimValue>
    | { [key: string]: ValidClaimValue }
    | (string | number | boolean);

  /**
   * A collection of vendor-specific claims. A platform vendor may add extra claims, it's not recommended though.
   * In the case it decides to include extra claims, it must declare the predicate of
   * each vendor claim (it must be a full resolved and unique URL, just like LTI's predicades).
   *
   * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#vendor-specific-extension-claims Vendor Specific Extension Claims}
   */
  export class VendorExtraClaims implements IntoLtiClaim {
    public constructor(
      private readonly vendorPredicade: string,
      private readonly claims: Record<string, ValidClaimValue>,
    ) {
      if (vendorPredicade.endsWith("/"))
        this.vendorPredicade = vendorPredicade.slice(
          0,
          vendorPredicade.length - 1,
        );
    }

    intoLtiClaim(): object {
      return Object.entries(this.claims).reduce((acc, [key, value]) => {
        acc[`${this.vendorPredicade}/${key}`] = value;
        return acc;
      }, {});
    }
  }
}
