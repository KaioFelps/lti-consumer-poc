import { ClassProperties } from "common/src/types/class-properties";
import { AnyLtiRole } from "$/claims/enums/roles";
import { IntoLtiClaim } from "$/claims/serialization";

type Args<CR> = Omit<ClassProperties<UserIdentity<CR>>, "extraClaims">;

export type UserRoles<CR = never> = [] | [AnyLtiRole, ...(CR | AnyLtiRole)[]];

/**
 * Represents a User (and hence a member) who is initiating the launch.
 */
export class UserIdentity<CustomRoles = never> implements IntoLtiClaim {
  /**
   * The user's ID within the platform.
   */
  public readonly id: string;
  /**
   * The user's given name (it's first name).
   */
  public readonly givenName?: string;
  /**
   * The user's family name (or surname).
   */
  public readonly familyName?: string;
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
  public readonly name?: string;
  /**
   * The user's e-mail address.
   */
  public readonly email?: string;
  /**
   * The user's preferred locale. This claim's value must be a locale tag according
   * to BCP47 specified in [RFC5646](https://datatracker.ietf.org/doc/html/rfc5646).
   */
  public readonly locale?: string;

  /**
   * A list of the roles the user has (in general or within the context that some launch will happen).
   * It may be empty. If not empty, at least one role must be a valid LTI role. Custom roles are accepted,
   * but must also be full URIs.
   *
   * Consider making an enum with your platform's available roles and passing to the generic `CustomRoles`
   * parameter to make this type-safe.
   */
  public roles?: UserRoles<CustomRoles> = [];

  private extraClaims_: Record<string, string> = {};

  private constructor(args: Args<CustomRoles>) {
    Object.assign(this, args);
  }

  public static create<CustomRoles>(args: Args<CustomRoles>) {
    return new UserIdentity(args);
  }

  intoLtiClaim(): object {
    return {
      sub: this.id,
      given_name: this.givenName,
      family_name: this.familyName,
      name: this.name,
      email: this.email,
      locale: this.locale,
      ...this.extraClaims_,
    };
  }

  /**
   * Inserts a extra user identity claim from those specified in [Standard Claims (OIDC Core 1.0)].
   *
   * [Standard Claims (OIDC Core 1.0)]: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
   */
  public addExtraClaim(key: string, value: string) {
    this.extraClaims_[key] = value;
  }

  public get extraClaims() {
    return this.extraClaims_;
  }
}
