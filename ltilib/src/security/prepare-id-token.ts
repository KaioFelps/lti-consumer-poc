import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import * as jose from "jose";
import { JOSENotSupported } from "jose/dist/types/util/errors";
import { Platform } from "$/core/platform";
import { ToolRecord } from "$/registration/tool-record";

type PrepareIdTokenArgs = {
  platform: Platform;
  targetTool: ToolRecord;
  nonce: string;
  /**
   * A LTI Claims object (with already resolved keys, i.e., return of some `message.intoLtiClaim()`).
   */
  claims: object;
};

export type PrepareIdTokenError = JOSENotSupported;

/**
 * Prepares the Id Token and its JWS, as specified by [LTI Security Framework 1.0].
 *
 * [LTI Security Framework 1.0]: https://www.imsglobal.org/spec/security/v1p0/#id-token
 */
export async function prepareIdToken({
  platform,
  targetTool,
  claims,
  nonce,
}: PrepareIdTokenArgs) {
  const algorithm = platform.jsonWebKey.alg ?? "RS256";

  const idToken = await pipe(
    taskEither.tryCatch(
      () => jose.importJWK(platform.jsonWebKey, algorithm),
      (error) => error as PrepareIdTokenError,
    ),
    taskEither.map((privateKey) =>
      taskEither.tryCatch(
        () =>
          new jose.SignJWT({
            ...claims,
            nonce,
            azp: targetTool.id,
          } as jose.JWTPayload)
            .setProtectedHeader({
              kid: platform.jsonWebKey.kid,
              typ: "JWT",
              alg: algorithm,
            })
            .setIssuer(platform.issuer)
            .setAudience(targetTool.id)
            .setIssuedAt()
            .setExpirationTime("10 minutes")
            .sign(privateKey),
        (error) => error as PrepareIdTokenError,
      ),
    ),
    taskEither.flattenW,
  )();

  return idToken;
}
