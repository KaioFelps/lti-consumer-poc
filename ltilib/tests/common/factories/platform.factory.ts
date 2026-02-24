import { faker } from "@faker-js/faker";
import { AllOptional } from "common/src/types/optional";
import { createMockKeySet } from "ltilib/tests/utils/create-jwks";
import { IPlatform, Platform } from "$/core/platform";

export async function createPlatformOpenIdConfiguration({
  issuer = faker.internet.url({ appendSlash: false, protocol: "https" }),
  authorizationEndpoint = new URL("/auth", issuer),
  jwksEndpoint = new URL("/keys", issuer),
  registrationEndpoint = new URL("/register", issuer),
  productFamilyCode = faker.commerce.productName(),
  claimsSupported = [],
  messagesSupported = [],
  token = {
    endpoint: new URL("/token", issuer),
  },
  version = faker.system.semver(),
}: AllOptional<Platform.IOpenIdConfiguration> = {}) {
  return Platform.OpenIdConfiguration.create({
    issuer,
    authorizationEndpoint,
    claimsSupported,
    jwksEndpoint,
    messagesSupported,
    productFamilyCode,
    registrationEndpoint,
    token,
    version,
  });
}

type CreatePlatformAgsConfigurationConstructorArgs =
  AllOptional<Platform.LtiAssignmentAndGradeServicesConfig> & { baseUrl?: URL };

export function createPlatformAgsConfiguration({
  deadlinesEnabled,
  lineItemsEndpoint,
  baseUrl,
}: CreatePlatformAgsConfigurationConstructorArgs = {}) {
  baseUrl ??= new URL(faker.internet.url({ protocol: "https" }));
  lineItemsEndpoint ??= (context, lineItemId) =>
    new URL(`/context/${context.id}/lineitems/${lineItemId.toString()}`, baseUrl);

  return Platform.LtiAssignmentAndGradeServicesConfig.create({
    lineItemsEndpoint,
    deadlinesEnabled,
  });
}

export async function createPlatform({
  initiateLaunchEndpoint,
  jsonWebKey,
  openIdConfiguration,
  instance,
  agsConfiguration = createPlatformAgsConfiguration(),
}: AllOptional<IPlatform> = {}) {
  const issuer = faker.internet.url({ protocol: "https", appendSlash: false });

  initiateLaunchEndpoint ??= (resourceLinkId) =>
    new URL(issuer, `/initiate/${resourceLinkId}`).toString();

  jsonWebKey ??= await createMockKeySet();
  openIdConfiguration ??= await createPlatformOpenIdConfiguration({ issuer });

  return Platform.create({
    initiateLaunchEndpoint,
    jsonWebKey,
    openIdConfiguration,
    instance,
    agsConfiguration,
  });
}

export default {
  createPlatform,
  createOpenIdConfiguration: createPlatformOpenIdConfiguration,
  createAgsConfiguration: createPlatformAgsConfiguration,
};
