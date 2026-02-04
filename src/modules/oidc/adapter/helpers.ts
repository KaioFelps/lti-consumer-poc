/**
 * See: https://github.com/panva/node-oidc-provider/discussions/1310
 */

export const grantable = new Set([
  "AccessToken",
  "AuthorizationCode",
  "RefreshToken",
  "DeviceCode",
  "BackchannelAuthenticationRequest",
]);

export function grantKeyFor(id: string) {
  return resolveOIDCKey(`grant:${id}`);
}

export function userCodeKeyFor(userCode: string) {
  return resolveOIDCKey(`user-code:${userCode}`);
}

export function uidKeyFor(uid: string) {
  return resolveOIDCKey(`uid:${uid}`);
}

export function resolveOIDCKey(key: string): string {
  return `oidc:${key}`;
}
