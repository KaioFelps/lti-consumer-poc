import { generateUUID } from "common/src/types/uuid";
import * as jose from "jose";

/**
 * Creates a mock JWKS locally.
 */
export async function createMockKeySet(kid: string = generateUUID()) {
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256");

  const publicJwk = await jose.exportJWK(publicKey);

  publicJwk.kid = kid;
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";

  const jwks = {
    keys: [publicJwk],
  };

  const jwksResolver = jose.createLocalJWKSet(jwks);

  return {
    privateKey,
    jwksResolver,
    kid,
    jwk: publicJwk,
  };
}
