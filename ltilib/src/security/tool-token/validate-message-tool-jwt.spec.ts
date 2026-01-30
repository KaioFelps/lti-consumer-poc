/**
 * Ensures `validateMessageToolJwt` is LTI compliant according to specifications
 * from sections [5.2.2] and [5.2.3].
 *
 *
 * [5.2.2]: https://www.imsglobal.org/spec/security/v1p0/#tool-jwt
 * [5.2.3]: https://www.imsglobal.org/spec/security/v1p0/#authentication-response-validation-0
 */

import { randomBytes } from "node:crypto";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import * as jose from "jose";
import { createMockKeySet } from "ltilib/tests/utils/create-jwks";
import { Platform } from "$/core/platform";
import { JoseJwtClaimValidationFailureReason } from "$/lib/jose";
import { validateMessageToolJwt } from "./validate-message-tool-jwt";

describe("validateMessageToolJwt", async () => {
  const { jwksResolver, privateKey, jwk, kid } = await createMockKeySet();

  const platformIssuer = "https://lms.uofexample.edu";
  const toolId = "s6BhdRkqt3";

  const platform = Platform.create({
    jsonWebKey: jwk,
    initiateLaunchEndpoint: () => "",
    openIdConfiguration: Platform.OpenIdConfiguration.create({
      issuer: platformIssuer,
      authorizationEndpoint: new URL(`${platformIssuer}/auth`),
      claimsSupported: [],
      jwksEndpoint: new URL(`${platformIssuer}/keys`),
      messagesSupported: [],
      productFamilyCode: "",
      registrationEndpoint: new URL(`${platformIssuer}/register`),
      token: {
        endpoint: new URL(`${platformIssuer}/token`),
      },
      version: "1.0.0",
    }),
  });

  const toolData = {
    clientId: toolId,
    jwks: jwksResolver,
  } satisfies Parameters<typeof validateMessageToolJwt>["2"];

  const validExpiration = (Date.now() + 10000) / 1000;
  const validIssuedAt = (Date.now() - 1000) / 1000;
  const validNonce = randomBytes(64).toString("base64");

  const protectedHeader = { alg: jwk.alg!, kid };

  it("should correctly validate compliant jwt", async () => {
    /**
     * A Tool JWT (i.e., a token sent FROM THE TOOL TO THE PLATFORM).
     * This implies the issuer is the tool's id given by the platform,
     * and the audience is the platform URL.
     */
    const jwt = await new jose.SignJWT({
      iss: toolId,
      aud: platformIssuer,
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      jwt,
      platform,
      toolData,
    );

    expect(either.isRight(jwtValidationResult)).toBeTruthy();
  });

  for (const requiredClaim of ["iss", "aud", "exp", "iat", "nonce"]) {
    test(`claim ${requiredClaim} is required`, async () => {
      const compliantPayload = {
        iss: toolId,
        aud: [platformIssuer],
        nonce: validNonce,
        exp: validExpiration,
        iat: validIssuedAt,
      };

      delete compliantPayload[requiredClaim];
      const nonCompliantPayload = compliantPayload;

      const jwt = await new jose.SignJWT(nonCompliantPayload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);

      const jwtValidationResult = await validateMessageToolJwt(
        jwt,
        platform,
        toolData,
      );

      expect(either.isLeft(jwtValidationResult)).toBeTruthy();

      if (either.isLeft(jwtValidationResult)) {
        const error = jwtValidationResult.left;
        expect(error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);
        expect((error as jose.errors.JWTClaimValidationFailed).reason).toBe(
          JoseJwtClaimValidationFailureReason.Missing,
        );
      }
    });
  }

  test("platform verifies jwt signature", async () => {
    const { privateKey: unknownPK } = await jose.generateKeyPair("RS256");
    const compliantTokenWithUnknownSignature = await new jose.SignJWT({
      iss: toolId,
      aud: [platformIssuer],
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(unknownPK);

    const jwtValidationResult = await validateMessageToolJwt(
      compliantTokenWithUnknownSignature,
      platform,
      toolData,
    );

    const isError = either.isLeft(jwtValidationResult);

    expect(isError).toBeTruthy();
    if (isError) {
      const error = jwtValidationResult.left;
      expect(error).toBeInstanceOf(jose.errors.JWSSignatureVerificationFailed);
    }
  });

  test("issuer must be tool's given client id", async () => {
    const tokenWithWrongIssuer = await new jose.SignJWT({
      iss: "some_other_client_id",
      aud: [platformIssuer],
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      tokenWithWrongIssuer,
      platform,
      toolData,
    );

    const isError = either.isLeft(jwtValidationResult);

    expect(isError).toBeTruthy();
    if (isError) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);

      const error = _error as jose.errors.JWTClaimValidationFailed;
      expect(error.reason).toBe(
        JoseJwtClaimValidationFailureReason.CheckFailed,
      );
      expect(error.claim).toBe("iss");
    }
  });

  test("platform must be one of jwt audiences", async () => {
    const tokenWithWrongAudience = await new jose.SignJWT({
      iss: toolId,
      aud: ["localhost"],
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      tokenWithWrongAudience,
      platform,
      toolData,
    );

    const isError = either.isLeft(jwtValidationResult);

    expect(isError).toBeTruthy();
    if (isError) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);

      const error = _error as jose.errors.JWTClaimValidationFailed;
      expect(error.claim).toBe("aud");
      expect(error.reason).toBe(
        JoseJwtClaimValidationFailureReason.CheckFailed,
      );
    }
  });

  test("azp is required when there is more than one audience", async () => {
    const tokenWithWrongAudience = await new jose.SignJWT({
      iss: toolId,
      aud: [platformIssuer, "localhost"],
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      tokenWithWrongAudience,
      platform,
      toolData,
    );

    const isError = either.isLeft(jwtValidationResult);

    expect(isError).toBeTruthy();
    if (isError) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);

      const error = _error as jose.errors.JWTClaimValidationFailed;
      expect(error.claim).toBe("azp");
      expect(error.reason).toBe(JoseJwtClaimValidationFailureReason.Missing);
    }
  });

  test("azp's value should be the platform's issuer URL", async () => {
    const payload = {
      iss: toolId,
      aud: [platformIssuer, "localhost"],
      nonce: validNonce,
      exp: validExpiration,
      iat: validIssuedAt,
    };

    payload["azp"] = "some invalid value";
    let jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    let jwtValidationResult = await validateMessageToolJwt(
      jwt,
      platform,
      toolData,
    );

    expect(either.isLeft(jwtValidationResult)).toBeTruthy();
    if (either.isLeft(jwtValidationResult)) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);

      const error = _error as jose.errors.JWTClaimValidationFailed;
      expect(error.claim).toBe("azp");
      expect(error.reason).toBe(
        JoseJwtClaimValidationFailureReason.CheckFailed,
      );
    }

    payload["azp"] = platformIssuer;
    jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    jwtValidationResult = await validateMessageToolJwt(jwt, platform, toolData);

    expect(
      either.isRight(jwtValidationResult),
      "it should successful verify that azp contains the platform's issuer URL",
    ).toBeTruthy();
  });

  it("should not validate expirated tokens", async () => {
    const expiredToken = await new jose.SignJWT({
      iss: toolId,
      aud: [platformIssuer, "localhost"],
      nonce: validNonce,
      exp: (Date.now() - 10000) / 1000,
      iat: validIssuedAt,
    })
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      expiredToken,
      platform,
      toolData,
    );

    const isError = either.isLeft(jwtValidationResult);
    expect(isError).toBeTruthy();

    if (isError) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTExpired);
    }
  });

  test("platforms should be able to define custom policies regarding nonce", async () => {
    const checkNonceIsValid = (nonce: string) => {
      const date = Number(nonce);
      const secondsSinceLastNonceUsage = (Date.now() - date) / 1000;
      const forbiddanceTimeWindow = 10; // seconds
      return secondsSinceLastNonceUsage >= forbiddanceTimeWindow;
    };

    const payload = {
      iss: toolId,
      aud: platformIssuer,
      exp: validExpiration,
      iat: validIssuedAt,
    };

    payload["nonce"] = (Date.now() - 1000).toString();
    const tokenWithInvalidNonce = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    let jwtValidationResult = await validateMessageToolJwt(
      tokenWithInvalidNonce,
      platform,
      toolData,
      {
        nonceIsFresh: checkNonceIsValid,
      },
    );

    expect(either.isLeft(jwtValidationResult)).toBeTruthy();
    if (either.isLeft(jwtValidationResult)) {
      const _error = jwtValidationResult.left;
      expect(_error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);

      const error = _error as jose.errors.JWTClaimValidationFailed;
      expect(error.claim).toBe("nonce");
      expect(error.reason).toBe(
        JoseJwtClaimValidationFailureReason.CheckFailed,
      );
    }

    payload["nonce"] = (Date.now() - 12000).toString();
    const tokenWithValidNonce = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    jwtValidationResult = await validateMessageToolJwt(
      tokenWithValidNonce,
      platform,
      toolData,
      {
        nonceIsFresh: checkNonceIsValid,
      },
    );

    expect(either.isRight(jwtValidationResult)).toBeTruthy();
  });

  it("should ignore any unknown claims", async () => {
    const payload = {
      iss: toolId,
      aud: platformIssuer,
      exp: validExpiration,
      iat: validIssuedAt,
      nonce: validNonce,
      someUnknown: "claim",
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    const jwtValidationResult = await validateMessageToolJwt(
      jwt,
      platform,
      toolData,
    );

    expect(either.isRight(jwtValidationResult)).toBeTruthy();
    if (either.isRight(jwtValidationResult)) {
      const claims = jwtValidationResult.right;
      expect(claims).not.haveOwnProperty("someUnknown");
    }
  });

  test("messages-specific claims must be allowable and validatable", async () => {
    const customClaim = "someMessageSpecificClaim";
    const customValidation = <T extends Record<string, unknown>>(claims: T) => {
      if (!claims[customClaim])
        return either.left(
          new jose.errors.JWTClaimValidationFailed(
            "foo",
            claims,
            customClaim,
            JoseJwtClaimValidationFailureReason.Missing,
          ),
        );

      return either.right(claims);
    };

    const payload = {
      iss: toolId,
      aud: platformIssuer,
      exp: validExpiration,
      iat: validIssuedAt,
      nonce: validNonce,
    };

    const invalidJwt = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    let jwtValidationResult = await validateMessageToolJwt(
      invalidJwt,
      platform,
      toolData,
      {
        messageSpecificClaims: [customClaim],
        validateMessageSpecificClaims: customValidation,
      },
    );

    expect(either.isLeft(jwtValidationResult)).toBeTruthy();
    if (either.isLeft(jwtValidationResult)) {
      const error = jwtValidationResult.left;
      expect(error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);
      expect((error as jose.errors.JWTClaimValidationFailed).claim).toBe(
        customClaim,
      );
    }

    payload[customClaim] = "claim";
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(protectedHeader)
      .sign(privateKey);

    jwtValidationResult = await validateMessageToolJwt(
      jwt,
      platform,
      toolData,
      {
        messageSpecificClaims: [customClaim],
        validateMessageSpecificClaims: customValidation,
      },
    );

    expect(either.isRight(jwtValidationResult)).toBeTruthy();
    if (either.isRight(jwtValidationResult)) {
      const claims = jwtValidationResult.right;
      expect(claims).haveOwnProperty(customClaim);
    }
  });

  describe("vendor-specific claims should be configurable and validatable", async () => {
    const vendorPrefix = "http://lti-consumer.poc" as const;

    type Payload = jose.JWTPayload & {
      [key in `${typeof vendorPrefix}/someCustomParameter`]: boolean;
    };

    const validator = (
      claims: Payload,
    ): Either<jose.errors.JWTClaimValidationFailed, Payload> => {
      const claimKey = `${vendorPrefix}/someCustomParameter`;
      const claim = claims[claimKey];
      if (claim === undefined) {
        return either.left(
          new jose.errors.JWTClaimValidationFailed(
            `Missing \`${claimKey}\` claim.`,
            claims,
            claimKey,
            JoseJwtClaimValidationFailureReason.Missing,
          ),
        );
      }

      if (typeof claim !== "boolean") {
        return either.left(
          new jose.errors.JWTClaimValidationFailed(
            `Invalid \`${claimKey}\` claim, expected a boolean.`,
            claims,
            claimKey,
            JoseJwtClaimValidationFailureReason.Invalid,
          ),
        );
      }

      return either.right(claims);
    };

    it("should not exclude vendor custom claims", async () => {
      const payload = {
        iss: toolId,
        aud: platformIssuer,
        exp: validExpiration,
        iat: validIssuedAt,
        nonce: validNonce,
        "http://lti-consumer.poc/someCustomParameter":
          "foo" as unknown as boolean,
      } satisfies Payload;

      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);

      const validationResult = await validateMessageToolJwt<Payload>(
        jwt,
        platform,
        toolData,
        {
          vendorPrefix,
        },
      );

      expect(either.isRight(validationResult)).toBeTruthy();

      if (either.isRight(validationResult)) {
        const claims = validationResult.right;
        expect(
          claims[`${vendorPrefix}/someCustomParameter`],
        ).not.toBeUndefined();
      }
    });

    it("should run vendor validations against claims", async () => {
      const payload = {
        iss: toolId,
        aud: platformIssuer,
        exp: validExpiration,
        iat: validIssuedAt,
        nonce: validNonce,
        "http://lti-consumer.poc/someCustomParameter":
          "foo" as unknown as boolean,
      } satisfies Payload;

      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);

      const validationResult = await validateMessageToolJwt<Payload>(
        jwt,
        platform,
        toolData,
        {
          vendorPrefix,
          vendorClaimsValidator: validator,
        },
      );

      expect(either.isLeft(validationResult)).toBeTruthy();

      // needed to unwrap this value since typescript can't see that `expect` will halt execution above
      if (either.isRight(validationResult)) return;
      const error = validationResult.left;

      expect(error).toBeInstanceOf(jose.errors.JWTClaimValidationFailed);
      // same as above
      if (!(error instanceof jose.errors.JWTClaimValidationFailed)) return;
      expect(error.claim).toBe(`${vendorPrefix}/someCustomParameter`);
      expect(error.reason).toBe(JoseJwtClaimValidationFailureReason.Invalid);
    });

    it("should verify vendor claims are correct", async () => {
      const payload = {
        iss: toolId,
        aud: platformIssuer,
        exp: validExpiration,
        iat: validIssuedAt,
        nonce: validNonce,
        "http://lti-consumer.poc/someCustomParameter": false,
      } satisfies Payload;

      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);

      const validationResult = await validateMessageToolJwt<Payload>(
        jwt,
        platform,
        toolData,
        {
          vendorPrefix,
          vendorClaimsValidator: validator,
        },
      );

      expect(either.isRight(validationResult)).toBeTruthy();
    });
  });

  test("message tool JWT `alg` must not be 'none'", async () => {
    const conformantPayload = {
      iss: toolId,
      aud: platformIssuer,
      exp: validExpiration,
      iat: validIssuedAt,
      nonce: validNonce,
    };

    // has { alg: "none" } header
    const jwt = new jose.UnsecuredJWT(conformantPayload).setIssuedAt().encode();

    const validationResult = await validateMessageToolJwt(
      jwt,
      platform,
      toolData,
    );

    expect(either.isLeft(validationResult)).toBeTruthy();

    if (either.isRight(validationResult)) return;
    const error = validationResult.left;
    expect(error).toBeInstanceOf(jose.errors.JOSEAlgNotAllowed);
  });
});
