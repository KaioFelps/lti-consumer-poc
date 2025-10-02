import { IntoLtiClaim } from "../serialization";

/**
 * This type describes the claims that may and/or must exist in a
 * OIDC ID Token.
 */
export class UserIdentityClaim implements IntoLtiClaim {
  private constructor(
    /**
     * The user's ID
     */
    public readonly sub: string,
    /**
     * The user's given name (it's first name).
     */
    public readonly givenName?: string,
    /**
     * The user's family name (or surname).
     */
    public readonly familyName?: string,
    /**
     * The user's resolved full name. This name includes all name parts,
     * potentially including titles and suffixes, and is ordered according to
     * the user's local culture and preferences.
     * For instance:
     * - In Japan, the family name typically precedes the given name.
     * - In Brazil, the given name precedes the surname(s).
     * - Some cultures may include a title (e.g., "Dr.") which must be present in
     * the full name string.
     */
    public readonly name?: string,
    /**
     * The user's e-mail address.
     */
    public readonly email?: string,
    /**
     * The user's preferred locale. This claim's value must be a locale tag according
     * to BCP47 specified in [RFC5646](https://datatracker.ietf.org/doc/html/rfc5646).
     */
    public readonly locale?: string,
    private extraClaims_: Record<string, string> = {},
  ) {}

  intoLtiClaim(): object {
    return {
      sub: this.sub,
      given_name: this.givenName,
      family_name: this.familyName,
      name: this.name,
      email: this.email,
      locale: this.locale,
    };
  }

  /**
   * This method instantiates an UserIdentity from the claims of an OIDC ID token.
   * Note that it does not apply any claim that isn't specified in the type to this UserIdentity
   * instance. Custom OIDC ID claims must be manually set to the `extraClaims` property.
   * @param claims the claims from an OIDC ID Token.
   */
  public static fromOIDCTokenClaims(
    claims: UserIdentityClaim,
  ): UserIdentityClaim {
    return new UserIdentityClaim(
      claims.sub,
      claims.givenName,
      claims.familyName,
      claims.name,
      claims.email,
      claims.locale,
    );
  }

  public addExtraClaim(key: string, value: string) {
    this.extraClaims_[key] = value;
  }

  public get extraClaims() {
    return this.extraClaims_;
  }
}
