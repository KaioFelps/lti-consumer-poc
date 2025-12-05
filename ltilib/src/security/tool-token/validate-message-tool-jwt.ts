import { either, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as jose from "jose";
import { errors as jerr } from "jose";
import { mapTaskEitherIntoEitherAndFlatten as mapAndFlatten } from "@/lib/fp-ts";
import { JoseJwtClaimValidationFailureReason } from "$/lib/jose";

type PlatformData = {
  issuerUrl: string;
};

type ToolData = {
  clientId: string;
  jwks: (protectedHeader?: unknown, token?: unknown) => Promise<CryptoKey>;
};

type VendorClaimsValidator<T extends jose.JWTPayload> = (
  claims: Record<string, unknown>,
) => Either<jerr.JWTClaimValidationFailed, T>;

export type ValidateMessageToolJwtOptions<T extends jose.JWTPayload> = {
  /**
   * Allows custom vendor-specific claims prefixed with this value.
   */
  vendorPrefix?: string;
  /**
   * A function called to validate vendor custom claims. It may return a error
   * message indicating to the tool developer what happened.
   */
  vendorClaimsValidator?: VendorClaimsValidator<T>;
  /**
   * The amount of time (in seconds) for which the JWT should be considered
   * yet valid. Your `nonce` should also have this time-to-live value.
   * @default 600 (10 minutes)
   */
  tokenTTL?: number;
  /**
   * Allows extra claims specific to the LTI Message which JWT is being validated
   * by returning them as a string array.
   */
  messageSpecificClaims?: string[];
  /**
   * Validates the claims specific from the current message (those specified by
   * `getMessageSpecificClaims` method).
   */
  validateMessageSpecificClaims?<T extends jose.JWTPayload>(
    claims: T,
  ): Either<jerr.JWTClaimValidationFailed, T>;
  /**
   * The platform must verify this nonce hasn't been seen within some time window,
   * as specified by [Authentication Response Validation section from LTI Security Framework].
   *
   * If `tokenTTL` is specified in the `options` parameter, then this function should also
   * use the same value as the time window for which the `nonce` should not be reused.
   *
   * [Authentication Response Validation section from LTI Security Framework]: https://www.imsglobal.org/spec/security/v1p0/#authentication-response-validation-0
   */
  nonceIsFresh?: (nonce: string) => boolean;
};

type ToolJwtValidationError =
  | jerr.JWTInvalid
  | jerr.JWSInvalid
  | jerr.JWSSignatureVerificationFailed
  | jerr.JWTClaimValidationFailed
  | jerr.JWTExpired
  | jerr.JOSEAlgNotAllowed;

const ltiMinimalRequiredClaimsSet = Object.freeze([
  "iss",
  "aud",
  "exp",
  "iat",
  "nonce",
]);

const ltiMinimalOptionalClaimsSet = Object.freeze(["azp"]);

const ltiMinimalAllowedClaimsSet = Object.freeze([
  ...ltiMinimalRequiredClaimsSet,
  ...ltiMinimalOptionalClaimsSet,
]);

/**
 * Validates the Tool JWT as specified in [Authentication Response Validation section from LTI Security Framework].
 *
 * [Authentication Response Validation section from LTI Security Framework]: https://www.imsglobal.org/spec/security/v1p0/#authentication-response-validation-0
 *
 * @param token the Tool JWT
 * @param platform required info about the platform
 * @param tool required info about the tool
 * @param nonceIsFresh a function that verifies whether the nonce haven't been used too recently.
 * @returns either the first error encountered during validation or the filtered and resolved claims.
 */
export async function validateMessageToolJwt<T extends jose.JWTPayload>(
  token: string,
  platform: PlatformData,
  tool: ToolData,
  options: ValidateMessageToolJwtOptions<T> = {},
): Promise<Either<ToolJwtValidationError, T>> {
  const validateMessageSpecificClaims = (claims: T) =>
    options.validateMessageSpecificClaims?.(claims) ?? either.right(claims);

  const maxTokenAge = options.tokenTTL ?? 600;
  const expectedIssuer = tool.clientId;
  const expectedAudience = platform.issuerUrl;

  if (options.vendorPrefix && !options.vendorPrefix.startsWith("http://")) {
    const error = new jerr.JWTInvalid(
      `${options.vendorPrefix} is not a valid public name for vendor-specific claims`,
    );
    return either.left(error);
  }

  const claims = await pipe(
    te.tryCatch(
      () =>
        jose.jwtVerify<T>(token, tool.jwks, {
          algorithms: ["RS256"],
          issuer: [expectedIssuer],
          audience: [expectedAudience],
          maxTokenAge,
          requiredClaims: ltiMinimalRequiredClaimsSet as string[],
        }),
      (error) => error as ToolJwtValidationError,
    ),
    te.map(({ payload }) => {
      const allowedClaims = resolveAllowedClaims(
        Object.keys(payload),
        ltiMinimalAllowedClaimsSet,
        options.messageSpecificClaims,
        options.vendorPrefix,
      );
      return [payload, allowedClaims] as const;
    }),
    te.map(([payload, allowedClaims]) =>
      discardUnknownClaims<T>(payload, allowedClaims),
    ),
    mapAndFlatten((claims) =>
      validateAudienceAndAzp(claims, platform.issuerUrl),
    ),
    mapAndFlatten((claims) => validateNonce(claims, options.nonceIsFresh)),
    mapAndFlatten(validateMessageSpecificClaims),
    mapAndFlatten((claims) =>
      performVendorValidations<T>(
        claims,
        options.vendorPrefix,
        options.vendorClaimsValidator,
      ),
    ),
  )();

  return claims;
}

function validateAudienceAndAzp<T extends jose.JWTPayload>(
  claims: T,
  issuer: string,
) {
  if (
    Array.isArray(claims.aud) &&
    claims.aud.length > 1 &&
    claims["azp"] === undefined
  ) {
    const error = new jerr.JWTClaimValidationFailed(
      "Since claim contains multiple audiences, `azp` must be present",
      claims,
      "azp",
      JoseJwtClaimValidationFailureReason.Missing,
    );
    return either.left(error);
  }

  if (claims["azp"] && claims["azp"] !== issuer) {
    const error = new jerr.JWTClaimValidationFailed(
      "If present, `azp` claim must have this platform's issuer URL as the audience",
      claims,
      "azp",
      JoseJwtClaimValidationFailureReason.CheckFailed,
    );
    return either.left(error);
  }

  return either.right(claims);
}

/**
 * Validates nonce exists and runs platform's nonce validations
 * against the received nonce value, as specified by LTI.
 */
function validateNonce<T extends jose.JWTPayload>(
  payload: T,
  nonceIsFresh: ValidateMessageToolJwtOptions<T>["nonceIsFresh"],
) {
  const nonce = payload["nonce"] as string | undefined;
  if (!nonce) {
    return either.left(
      new jerr.JWTClaimValidationFailed(
        "`nonce` is a mandatory claim, but it is not present",
        payload,
        "nonce",
        JoseJwtClaimValidationFailureReason.Missing,
      ),
    );
  }

  if (nonceIsFresh !== undefined && !nonceIsFresh(nonce)) {
    return either.left(
      new jerr.JWTClaimValidationFailed(
        "Invalid `nonce` received",
        payload,
        "nonce",
        JoseJwtClaimValidationFailureReason.CheckFailed,
      ),
    );
  }

  return either.right(payload);
}

/**
 * Runs vendor's validations if present or simply return the claims
 * untouched otherwise.
 */
function performVendorValidations<T extends Record<string, unknown>>(
  claims: T,
  vendorPrefix?: string,
  vendorValidator?: VendorClaimsValidator<T>,
): Either<ToolJwtValidationError, T> {
  const vendorEntries = vendorPrefix
    ? Object.entries(claims).filter(([key, _]) => key.startsWith(vendorPrefix))
    : [];
  const vendorClaims = Object.fromEntries(vendorEntries);
  return vendorValidator?.(vendorClaims) ?? either.right(claims);
}

function resolveAllowedClaims(
  existingClaims: readonly string[],
  minimal: readonly string[],
  extra?: readonly string[],
  allowancePrefix?: string,
) {
  const allowedClaims = [
    ...minimal,
    ...(extra ?? []),
    ...(allowancePrefix
      ? existingClaims.filter((key) => key.startsWith(allowancePrefix!))
      : []),
  ];

  return allowedClaims;
}

/**
 * Filters away every unknown claims present in the payload, as specified by LTI Security Framework.
 */
function discardUnknownClaims<T>(
  claims: Record<string, unknown>,
  allowedClaims: string[],
) {
  const filtredPairs = Object.entries(claims).filter(([key, _]) => {
    return allowedClaims.includes(key);
  });

  return Object.fromEntries(filtredPairs) as T;
}
