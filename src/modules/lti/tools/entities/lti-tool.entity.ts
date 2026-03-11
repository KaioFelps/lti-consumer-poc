import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import { ClientMetadata } from "oidc-provider";
import type { ZodError } from "zod";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { LtiTool as BaseLtiTool } from "$/core/tool";
import { Contact, LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";
import { draftLtiDynamicToolConfigurationSchema } from "../lti-tool-config-schemas";

export class LtiTool {
  public constructor(public record: BaseLtiTool) {}

  public static tryCreateFromClientMetadata(metadata: object) {
    return pipe(
      either.tryCatch(
        () => draftLtiDynamicToolConfigurationSchema.parse(metadata),
        (err) => mapZodErrorsToCoreValidationErrors(err as ZodError),
      ),
      either.map((metadata) => {
        const ltiConfig = metadata[LTI_TOOL_CONFIGURATION_KEY];
        const ltiTool = BaseLtiTool.create({
          id: metadata.client_id ?? nanoid(),
          applicationType: metadata.application_type,
          contacts: metadata.contacts as Contact[],
          grantTypes: metadata.grant_types,
          name: metadata.client_name,
          responseTypes: metadata.response_types,
          scopes: metadata.scope.split(" "),
          tokenEndpointAuthMethod: metadata.token_endpoint_auth_method,
          initiateUrl: new URL(metadata.initiate_login_uri),
          jwksUrl: new URL(metadata.jwks_uri),
          redirectUrls: metadata.redirect_uris,
          homePageUrl: metadata.client_uri ? new URL(metadata.client_uri) : undefined,
          logoUrl: metadata.logo_uri ? new URL(metadata.logo_uri) : undefined,
          policyUrl: metadata.policy_uri ? new URL(metadata.policy_uri) : undefined,
          termsOfServiceUrl: metadata.tos_uri ? new URL(metadata.tos_uri) : undefined,
          claims: ltiConfig.claims,
          domain: ltiConfig.domain,
          messages: ltiConfig.messages.map(
            (message) =>
              new BaseLtiTool.SupportedMessage({
                type: message.type,
                customParameters: message.custom_parameters,
                iconUri: message.icon_uri,
                label: message.label,
                placements: message.placements,
                roles: message.roles,
                targetLinkUri: message.target_link_uri,
              }),
          ),
          targetLinkUri: new URL(ltiConfig.target_link_uri),
          customParameters: ltiConfig.custom_parameters,
          description: ltiConfig.description,
          deploymentsIds: [],
        });
        return pipe(
          ltiTool,
          either.map((record) => new LtiTool(record)),
          either.mapLeft((err) => {
            const validationErrors = new ValidationErrors();

            Object.entries(err.errors).forEach(([key, _]) => {
              const invalidArgumentError = new InvalidArgumentError({
                errorMessageIdentifier: `lti:tool:create:errors:ltilib-${key}`,
                argumentName: key,
              });
              validationErrors.appendError(invalidArgumentError);
            });

            return validationErrors;
          }),
        );
      }),
      either.flattenW,
    );
  }

  public asClientMetadata(): ClientMetadata {
    const ltiClaims = this.record.intoLtiClaim();
    const { [LTI_TOOL_CONFIGURATION_KEY]: _, ...claims } = ltiClaims;
    return claims;
  }
}
