import {
  Account,
  type AccountClaims,
  type CanBePromise,
  ClaimsParameterMember,
} from "oidc-provider";
import { Person } from "@/modules/identity/person/person.entity";

export class OIDCAccount implements Account {
  public constructor(public readonly person: Person) {}
  [key: string]: unknown;

  get accountId() {
    return this.person.getUser().getId().toString();
  }

  /**
   * See [OIDC Claims].
   *
   * [OIDC Claims]: https://openid.net/specs/openid-connect-core-1_0.html#Claims
   */
  public claims(
    _use: string,
    _scope: string,
    _claims: { [key: string]: null | ClaimsParameterMember },
    _rejected: string[],
  ): CanBePromise<AccountClaims> {
    return {
      // Claims explicitly cited by LTI.
      // See: https://www.imsglobal.org/spec/lti/v1p3/#user-identity-claims
      sub: this.accountId,
      name: this.person.getName(),
      given_name: this.person.getFirstName(),
      family_name: this.person.getSurname(),
      email: this.person.getEmail(),
      locale: "pt-BR",
      gender: this.person.getGender(),

      // Other claims from OpenID Connect Standard Claims list
      nickname: this.person.getUser().getUsername(),
      birthdate: this.person.getBirthDate(),
      // email_verified: boolean,
    };
  }
}
