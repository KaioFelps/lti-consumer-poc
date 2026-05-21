import { Injectable, Scope } from "@nestjs/common";
import * as jose from "jose";
import { JWK } from "jose";
import { EnvironmentVars } from "@/config/environment-vars";

@Injectable({ scope: Scope.DEFAULT })
export class AuthJwkSet {
  protected constructor(
    public readonly keySetId: string,
    public readonly privateJwk: JWK,
    public readonly publicPem: string,
  ) {}

  public static async create(envVars: EnvironmentVars) {
    const privatePemBase64 = envVars.app.privateKeyB64;
    const algorithm = "RS256";

    const privateKey = await jose.importPKCS8(
      Buffer.from(privatePemBase64, "base64").toString("utf-8"),
      algorithm,
      { extractable: true },
    );

    const jwk = await jose.exportJWK(privateKey);

    const kid = await jose.calculateJwkThumbprint(jwk, "sha256");
    jwk.kid = kid;
    jwk.use = "sig";
    jwk.alg = algorithm;

    const publicJwk = AuthJwkSet.extractPublicJwk(jwk, kid);
    const publicKey = (await jose.importJWK(publicJwk, "RS256")) as CryptoKey;
    const publicPem = await jose.exportSPKI(publicKey);

    return new AuthJwkSet(kid, jwk, publicPem);
  }

  public toPrivateKeyset() {
    return {
      keys: [this.privateJwk],
    };
  }

  public static extractPublicJwk(privateJwk: jose.JWK, keySetId: string) {
    const publicJwk = {
      kty: privateJwk.kty,
      n: privateJwk.n,
      e: privateJwk.e,
      alg: privateJwk.alg,
      use: privateJwk.use,
      kid: keySetId,
    } satisfies JWK;

    return publicJwk;
  }

  public toPublicKeyset() {
    return {
      keys: [AuthJwkSet.extractPublicJwk(this.privateJwk, this.keySetId)],
    };
  }
}
