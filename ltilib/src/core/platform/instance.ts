import { IntoLtiClaim } from "$/claims/serialization";

export interface IInstance {
  /**
   * A globally unique ID that identifies the platform instance within the issuer
   * (the platform itself). This field must contain only ASCII characters and must be no longer
   * than 255 characters.
   *
   * E.g.: three institutions use your platform, however each of them uses a virtual instance
   * of it, and each virtual instance has an unique ID within the platform.
   */
  guid: string;
  /**
   * E-mail address for administrative issues.
   */
  contactEmail?: string;
  /**
   * Description of the plataform instance.
   */
  description?: string;
  /**
   * Name of this instance of the platform.
   */
  name?: string;
  /**
   * The URL to the platform instance's home page.
   *
   * @example "https://<institution>.platform.com"
   */
  url?: URL;
  /**
   * Vendor's family code for the platform product line
   * (that the instance that triggered the launch belongs to).
   *
   * @example "moodle"
   */
  productFamilyCode?: string;
  /**
   * Vendor's version of the underlying platform which instance
   * has triggered the launch.
   *
   * @example "5.1"
   */
  version?: string;
}

/*
 * When in multi-tenancy case, the platform instance initiating the launch can identify itself
 * through the [Platform instance claim]. If present, this `Platform.Instance` will compose
 * that claim.
 *
 * [Platform instance claim]: https://www.imsglobal.org/spec/lti/v1p3/#platform-instance-claim
 */
export class Instance implements IInstance, IntoLtiClaim {
  public readonly guid: string;
  public readonly contactEmail?: string;
  public readonly description?: string;
  public readonly name?: string;
  public readonly url?: URL;
  public readonly productFamilyCode?: string;
  public readonly version?: string;

  protected constructor(args: IInstance) {
    Object.assign(this, args);
  }

  public static create(args: IInstance) {
    return new Instance(args);
  }

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
