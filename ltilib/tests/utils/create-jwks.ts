import { generateUUID } from "common/src/types/uuid";
import * as jose from "jose";

/**
 * Creates a mock JWKS locally.
 */
export async function createMockKeySet(kid: string = generateUUID()) {
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256", {
    extractable: true,
  });

  const publicJwk = await jose.exportJWK(publicKey);
  const privateJwk = await jose.exportJWK(privateKey);

  for (const jwk of [publicJwk, privateJwk]) {
    jwk.kid = kid;
    jwk.use = "sig";
    jwk.alg = "RS256";
  }

  const jwks = {
    keys: [publicJwk],
  };

  const jwksResolver = jose.createLocalJWKSet(jwks);

  return {
    privateKey,
    jwksResolver,
    kid,
    jwk: privateJwk,
  };
}
