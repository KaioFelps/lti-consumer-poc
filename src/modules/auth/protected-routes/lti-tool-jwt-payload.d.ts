export interface LtiToolJwtPayload {
  /**
   * The issuer of this token (the platform itself)
   */
  iss: string;
  /**
   * The identifier of the tool
   */
  sub: string;
  /**
   * The audience of this token (the platform itself, since it also acts like the
   * resource server)
   */
  aud: string | string[];
  /**
   * Scopes granted to this token. Note that, even though the scope might have been
   * granted, it still needs to have been registered in the platform record.
   */
  scope: string;
  /**
   * Expiration timestamp.
   */
  exp: number;
  iat: number;
  jti: string;
}
