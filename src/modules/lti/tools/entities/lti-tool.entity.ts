import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import { ClientMetadata } from "oidc-provider";
import type { ZodError } from "zod";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { Contact, LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { draftLtiDynamicToolConfigurationSchema } from "../lti-tool-config-schemas";

export class LtiTool {
  public constructor(public record: ToolRecord) {}

  public static tryCreateFromClientMetadata(metadata: object) {
    return pipe(
      either.tryCatch(
        () => draftLtiDynamicToolConfigurationSchema.parse(metadata),
        (err) => mapZodErrorsToCoreValidationErrors(err as ZodError),
      ),
      either.map((metadata) => {
        const ltiConfig = metadata[LTI_TOOL_CONFIGURATION_KEY];
        const ltiTool = ToolRecord.create({
          id: metadata.client_id ?? nanoid(),
          applicationType: metadata.application_type,
          contacts: metadata.contacts as Contact[],
          grantTypes: metadata.grant_types,
          name: metadata.client_name,
          responseTypes: metadata.response_types,
          scope: metadata.scope,
          tokenEndpointAuthMethod: metadata.token_endpoint_auth_method,
          uris: {
            initiate: metadata.initiate_login_uri,
            jwks: metadata.jwks_uri,
            redirect: metadata.redirect_uris,
            homePage: metadata.client_uri,
            logo: metadata.logo_uri,
            policy: metadata.policy_uri,
            tos: metadata.tos_uri,
          },
          ltiConfiguration: {
            claims: ltiConfig.claims,
            domain: ltiConfig.domain,
            messages: ltiConfig.messages.map(
              (message) =>
                new ToolSupportedMessage({
                  type: message.type,
                  customParameters: message.custom_parameters,
                  iconUri: message.icon_uri,
                  label: message.label,
                  placements: message.placements,
                  roles: message.roles,
                  targetLinkUri: message.target_link_uri,
                }),
            ),
            targetLinkUri: ltiConfig.target_link_uri,
            customParameters: ltiConfig.custom_parameters,
            description: ltiConfig.description,
            deploymentsIds: [],
          },
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
