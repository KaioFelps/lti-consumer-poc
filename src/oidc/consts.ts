export const AvailableACRs = Object.freeze({
  /**
   * Level of Assurance 0: a non-authenticated user.
   */
  loa0: "0",
  /**
   * Level of Assurance 1: single-factor authenticated user (with, i.e., login + password).
   */
  loa1: "1",
});

export const AvailableScopes = Object.freeze([
  "openid",
  /**
   * Allow refresh tokens to be issued along with access tokens.
   * See: https://openid.net/specs/openid-connect-core-1_0.html#OfflineAccess
   */
  "offline_access",
]);
