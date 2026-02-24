import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either, option as o } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { type IToolRecord, ToolRecord } from "$/registration/tool-record";

type ToolUrisConstructorArgs = Partial<IToolRecord["uris"]>;

export function createToolUris(
  { homePage, initiate, jwks, logo, policy, redirect, tos }: ToolUrisConstructorArgs = {},
  baseUrl?: URL,
): IToolRecord["uris"] {
  const getBaseUrl = () => {
    const firstGivenUrl = pipe(
      homePage || initiate || jwks || logo || policy || tos || redirect?.[0],
      o.fromNullable,
      o.getOrElse(() => faker.internet.url({ protocol: "https" })),
      (url) => new URL(url),
    );
    firstGivenUrl.protocol = "https";
    return firstGivenUrl;
  };

  baseUrl ??= getBaseUrl();
  homePage ??= new URL("/", baseUrl).toString();
  initiate ??= new URL("/initiate", baseUrl).toString();
  jwks ??= new URL("/keys", baseUrl).toString();
  redirect ??= [new URL("/launch", baseUrl).toString()];

  return {
    initiate,
    jwks,
    redirect,
    homePage,
    logo,
    policy,
    tos,
  };
}

type ToolLtiConfigurationConstructorArgs = Partial<IToolRecord["ltiConfiguration"]>;

export const DEFAULT_MOCK_CLAIMS = [
  "iss",
  "sub",
  "aud",
  "given_name",
  "family_name",
  "email",
  "picture",
] as const;

export function createToolLtiConfiguration({
  claims = [...DEFAULT_MOCK_CLAIMS],
  customParameters = {},
  deploymentsIds = [],
  description = faker.company.buzzPhrase(),
  domain = faker.internet.domainName(),
  messages = [],
  targetLinkUri,
}: ToolLtiConfigurationConstructorArgs = {}): IToolRecord["ltiConfiguration"] {
  targetLinkUri ??= new URL("/launch", `https://${domain}`).toString();
  return {
    claims,
    customParameters,
    deploymentsIds,
    domain,
    messages,
    targetLinkUri,
    description,
  };
}

type ToolRecordConstructorArgs = Partial<
  Omit<
    IToolRecord,
    "applicationType" | "tokenEndpointAuthMethod" | "grantTypes" | "responseTypes" | "scope"
  > & { scopes: string[] }
>;

/**
 * Creates a mocked `ToolRecord` with fake data or throw if it fails.
 * Intended for testing purposes only.
 */
export function createTool({
  clientSecret,
  contacts = [],
  id = generateUUID(),
  ltiConfiguration,
  name = faker.company.name(),
  uris,
  scopes = [],
}: Partial<ToolRecordConstructorArgs> = {}) {
  const platformFakeUrl = new URL(faker.internet.url({ protocol: "https", appendSlash: false }));

  ltiConfiguration ??= createToolLtiConfiguration({ domain: platformFakeUrl.hostname });
  uris ??= createToolUris({}, platformFakeUrl);

  return pipe(
    ToolRecord.create({
      applicationType: "web",
      grantTypes: ["client_credentials", "implicit"],
      id,
      name,
      scope: Array.from(new Set([...scopes, "openid"])).join(" "),
      responseTypes: ["id_token"],
      contacts,
      clientSecret,
      ltiConfiguration,
      tokenEndpointAuthMethod: "private_key_jwt",
      uris,
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
  createLtiConfiguration: createToolLtiConfiguration,
  createUris: createToolUris,
  DEFAULT_MOCK_CLAIMS,
};
