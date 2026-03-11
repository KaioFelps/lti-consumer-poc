import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { decodeJwt } from "jose";
import { createMockKeySet } from "ltilib/tests/utils/create-jwks";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { prepareIdToken } from "./prepare-id-token";

describe("prepareIdToken", async () => {
  const { jwk } = await createMockKeySet();

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

  const nonce = "n-0S6_WzA2Mj";
  const claims = { sub: "24400320" };

  const targetTool = pipe(
    LtiTool.create({
      id: toolId,
      applicationType: "web",
      grantTypes: ["client_credentials", "implicit"],
      name: "Foo",
      scopes: ["openid"],
      responseTypes: ["id_token"],
      tokenEndpointAuthMethod: "private_key_jwt",
      initiateUrl: new URL("https://foo.com/initiate"),
      jwksUrl: new URL("https://foo.com/jwks"),
      redirectUrls: ["https://foo.com/launch"],
      claims: [],
      deploymentsIds: ["deployment-1"],
      domain: "foo.com",
      targetLinkUri: new URL("https://foo.com/callback"),
      messages: [],
    }),
    either.match(
      (error) => {
        throw error;
      },
      (tool) => tool,
    ),
  );

  it("should generate a valid and conformant Id Token", async () => {
    const token = await prepareIdToken({
      platform,
      targetTool,
      claims,
      nonce,
    });

    expect(either.isRight(token)).toBeTruthy();

    if (either.isLeft(token)) return;
    const payload = decodeJwt(token.right);
    expect(payload).toMatchObject({
      iss: "https://lms.uofexample.edu",
      sub: "24400320",
      aud: "s6BhdRkqt3",
      nonce: "n-0S6_WzA2Mj",
      exp: expect.any(Number),
      iat: expect.any(Number),
    });
  });
});
