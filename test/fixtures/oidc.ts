import { type INestApplication } from "@nestjs/common";
import { importJWK, JWK, SignJWT } from "jose";
import toolFactory from "ltilib/tests/common/factories/tool.factory";
import { createMockKeySet } from "ltilib/tests/utils/create-jwks";
import supertest from "supertest";
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity";
import { UnsafeOIDCClientsInjectionContainer } from "@/modules/oidc/unsafe-clients-injection-container";
import { Routes } from "@/routes";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Platform } from "$/core/platform";
import { LtiTool as LtilibTool } from "$/core/tool";

export async function generateClientAssertion(
  clientId: string,
  platformIssuer: string,
  privateKeyJwk: JWK,
): Promise<string> {
  const privateKey = await importJWK(privateKeyJwk, "RS256");

  const signedJwtString = await new SignJWT({
    iss: clientId,
    sub: clientId,
    aud: platformIssuer,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: privateKeyJwk.kid,
    })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);

  return signedJwtString;
}

export async function injectMockedLtiToolRecord(
  unsafeOidcClientsContainer: UnsafeOIDCClientsInjectionContainer,
  tool?: LtiTool,
) {
  tool ??= new LtiTool(
    toolFactory.createTool({
      scopes: [
        AssignmentAndGradeServiceScopes.Lineitem,
        AssignmentAndGradeServiceScopes.ResultReadonly,
        AssignmentAndGradeServiceScopes.Score,
      ],
    }),
  );

  const metadata = tool.asClientMetadata();

  // these are exclusive
  const mockKeySet = await createMockKeySet();
  metadata.jwks = mockKeySet.jwks;
  delete metadata.jwks_uri;

  unsafeOidcClientsContainer.__pushClientMetadataToUnsafeCache(metadata);
  return { tool, metadata, mockKeySet };
}

export async function prepareToolOidcTokenRequest(
  platform: Platform,
  client: Awaited<ReturnType<typeof injectMockedLtiToolRecord>>,
) {
  const clientAssertion = await generateClientAssertion(
    client.metadata.client_id,
    platform.issuer,
    client.mockKeySet.privateJwk,
  );

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", client.metadata.client_id);
  params.append("scope", client.metadata.scope!);
  params.append("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
  params.append("client_assertion", clientAssertion);

  return {
    route: Routes.oidc.token(),
    headers: [["Content-Type", "application/x-www-form-urlencoded"]],
    body: params.toString(),
  };
}

export async function getToolAndItsOidcAccessToken(
  app: INestApplication,
  tool?: LtiTool | LtilibTool,
) {
  const platform = app.get(Platform);
  const unsafeOidcClientContainer = app.get(UnsafeOIDCClientsInjectionContainer);

  const domainTool = tool instanceof LtilibTool ? new LtiTool(tool) : tool;
  const client = await injectMockedLtiToolRecord(unsafeOidcClientContainer, domainTool);
  const { body, headers, route } = await prepareToolOidcTokenRequest(platform, client);
  let request = supertest(app.getHttpServer()).post(route);

  for (const [key, value] of headers) request = request.set(key, value);

  const response = await request.send(body);
  const accessToken = response.body.access_token as string;

  return {
    accessToken,
    tool: client.tool,
  };
}
