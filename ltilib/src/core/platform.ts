import { ClassProperties } from "common/src/types/class-properties";
import { JWK } from "jose";
import { IntoLtiClaim } from "$/claims/serialization";

/**
 * Represents a LTI Platform.
 */
export class Platform {
  /**
   * The platform's URL which is used to identify itself to tools.
   */
  public readonly issuer: string;
  /**
   * The platform's private key used to sign JWSs.
   */
  public readonly jsonWebKey: JWK;

  /**
   * Represents an instance of the platform.
   *
   * @see {@link Platform.Instance}
   * @see {@link https://www.cloudflare.com/learning/cloud/what-is-multitenancy/ Multitenancy}
   */
  public readonly instance?: Platform.Instance;

  public constructor(args: ClassProperties<Platform>) {
    Object.assign(this, args);
  }
}

export namespace Platform {
  /*
   * When in multi-tenancy case, the platform instance initiating the launch can identify itself
   * through the [Platform instance claim]. If present, this `Platform.Instance` will compose
   * that claim.
   *
   * [Platform instance claim]: https://www.imsglobal.org/spec/lti/v1p3/#platform-instance-claim
   */
  export class Instance implements IntoLtiClaim {
    /**
     * A globally unique ID that identifies the platform instance within the issuer
     * (the platform itself). This field must contain only ASCII characters and must be no longer
     * than 255 characters.
     *
     * E.g.: three institutions use your platform, however each of them uses a virtual instance
     * of it, and each virtual instance has an unique ID within the platform.
     */
    public readonly guid: string;
    /**
     * E-mail address for administrative issues.
     */
    public readonly contactEmail?: string;
    /**
     * Description of the plataform instance.
     */
    public readonly description?: string;
    /**
     * Name of this instance of the platform.
     */
    public readonly name?: string;
    /**
     * The URL to the platform instance's home page.
     *
     * @example "https://<institution>.platform.com"
     */
    public readonly url?: URL;
    /**
     * Vendor's family code for the platform product line
     * (that the instance that triggered the launch belongs to).
     *
     * @example "moodle"
     */
    public readonly productFamilyCode?: string;
    /**
     * Vendor's version of the underlying platform which instance
     * has triggered the launch.
     *
     * @example "5.1"
     */
    public readonly version?: string;

    intoLtiClaim(): object {
      return {
        guid: this.guid,
        contact_email: this.contactEmail,
        description: this.description,
        name: this.name,
        url: this.url?.toString(),
        product_family_code: this.productFamilyCode,
        version: this.version,
      };
    }
  }
}
