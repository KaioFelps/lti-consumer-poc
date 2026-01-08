import { Injectable, Scope } from "@nestjs/common";
import * as jose from "jose";
import { JWK } from "jose";
import { EnvironmentVars } from "@/config/environment-vars";

@Injectable({ scope: Scope.DEFAULT })
export class AuthJwkSet {
  protected constructor(
    public readonly keySetId: string,
    public readonly privateJwk: JWK,
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

    return new AuthJwkSet(kid, jwk);
  }

  public toPrivateKeyset() {
    return {
      keys: [this.privateJwk],
    };
  }

  public toPublicKeyset() {
    const publicJwk = {
      kty: this.privateJwk.kty,
      n: this.privateJwk.n,
      e: this.privateJwk.e,
      alg: this.privateJwk.alg,
      use: this.privateJwk.use,
      kid: this.keySetId,
    } satisfies JWK;

    return {
      keys: [publicJwk],
    };
  }
}
