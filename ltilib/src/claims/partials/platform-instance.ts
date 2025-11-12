import { IntoLtiClaim } from "../serialization";

export class PlatformInstanceClaim implements IntoLtiClaim {
  private constructor(
    /**
     * A globally unique ID that identifies the platform instance within the issuer (the platform itself).
     * E.g., three schools using your platform, with an unique ID each.
     *
     * This field must contain only ASCII characters and must be no longer than 255 characters.
     */
    public readonly guid: string,
    /**
     * E-mail address for administrative issues.
     */
    public readonly contactEmail?: string,
    /**
     * Description of the plataform instance.
     */
    public readonly description?: string,
    /**
     * Name of this instance of the platform.
     */
    public readonly name?: string,
    /**
     * The URL to the platform instance's home page.
     *
     * @example "https://<institution>.platform.com"
     */
    public readonly url?: URL,
    /**
     * Vendor's family code for the platform product line
     * (that the instance that triggered the launch belongs to).
     *
     * @example "moodle"
     */
    public readonly productFamilyCode?: string,
    /**
     * Vendor's version of the underlying platform which instance
     * has triggered the launch.
     *
     * @example "5.1"
     */
    public readonly version?: string,
  ) {}

  public static fromClaims(
    claims: PlatformInstanceClaim,
  ): PlatformInstanceClaim {
    return new PlatformInstanceClaim(
      claims.guid,
      claims.contactEmail,
      claims.description,
      claims.name,
      claims.url,
      claims.productFamilyCode,
      claims.version,
    );
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
