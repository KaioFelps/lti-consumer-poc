import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either, option as o } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { resolveFactoryOptional } from "ltilib/tests/utils/resolve-nullified-optional";
import { type ILtiTool, LtiTool } from "$/core/tool";
import { NullifyUndefined } from "../types/nullify";

type ToolURIs = {
  targetLinkUri: URL;
  initiateUrl: URL;
  jwksUrl: URL;
  redirectUrls: string[];
  homePageUrl?: URL;
  logoUrl?: URL;
  termsOfServiceUrl?: URL;
  policyUrl?: URL;
};

type ToolUrisConstructorArgs = Partial<NullifyUndefined<ToolURIs>>;

export function createToolUris(
  {
    homePageUrl,
    initiateUrl,
    jwksUrl,
    logoUrl,
    policyUrl,
    redirectUrls,
    termsOfServiceUrl,
    targetLinkUri,
  }: ToolUrisConstructorArgs = {},
  baseUrl?: URL,
): ToolURIs {
  const getBaseUrl = () => {
    const firstGivenUrl = pipe(
      homePageUrl ||
        initiateUrl ||
        jwksUrl ||
        logoUrl ||
        policyUrl ||
        termsOfServiceUrl ||
        redirectUrls?.[0],
      o.fromNullable,
      o.getOrElse(() => faker.internet.url({ protocol: "https" })),
      (url) => new URL(url),
    );
    firstGivenUrl.protocol = "https";
    return firstGivenUrl;
  };

  targetLinkUri ??= new URL("/launch", baseUrl);
  baseUrl ??= getBaseUrl();
  homePageUrl ??= new URL("/", baseUrl);
  initiateUrl ??= new URL("/initiate", baseUrl);
  jwksUrl ??= new URL("/keys", baseUrl);
  redirectUrls ??= [new URL("/launch", baseUrl).toString()];
  logoUrl = resolveFactoryOptional(logoUrl, new URL("/logo.png", baseUrl));
  policyUrl = resolveFactoryOptional(policyUrl, new URL("/policy", baseUrl));
  termsOfServiceUrl = resolveFactoryOptional(
    termsOfServiceUrl,
    new URL("/terms-of-service", baseUrl),
  );

  return {
    initiateUrl,
    jwksUrl,
    redirectUrls,
    homePageUrl,
    logoUrl,
    policyUrl,
    termsOfServiceUrl,
    targetLinkUri,
  };
}

export const DEFAULT_MOCK_CLAIMS = [
  "iss",
  "sub",
  "aud",
  "given_name",
  "family_name",
  "email",
  "picture",
] as const;

type LtiToolConstructorArgs = Partial<
  Omit<
    ILtiTool,
    "applicationType" | "tokenEndpointAuthMethod" | "grantTypes" | "responseTypes" | "scope"
  > & { scopes: string[] }
>;

/**
 * Creates a mocked `LtiTool` with fake data or throw if it fails.
 * Intended for testing purposes only.
 */
export function createTool({
  clientSecret,
  contacts = [],
  id = generateUUID(),
  claims = [...DEFAULT_MOCK_CLAIMS],
  customParameters = {},
  deploymentsIds = [],
  description = faker.company.buzzPhrase(),
  domain = faker.internet.domainName(),
  messages = [],
  name = faker.company.name(),
  scopes = [],
  ...uris
}: Partial<LtiToolConstructorArgs> = {}) {
  const platformFakeUrl = new URL(faker.internet.url({ protocol: "https", appendSlash: false }));

  const resolvedURIs = createToolUris(uris, platformFakeUrl);

  return pipe(
    LtiTool.create({
      applicationType: "web",
      grantTypes: ["client_credentials", "implicit"],
      id,
      name,
      scopes: Array.from(new Set([...scopes, "openid"])),
      responseTypes: ["id_token"],
      contacts,
      clientSecret,
      tokenEndpointAuthMethod: "private_key_jwt",
      claims,
      deploymentsIds,
      domain,
      messages,
      customParameters,
      description,
      ...resolvedURIs,
    }),
    either.fold(
      (err) => {
        throw err;
      },
      (tool) => tool,
    ),
  );
}

export default {
  createTool,
  createUris: createToolUris,
  DEFAULT_MOCK_CLAIMS,
};
