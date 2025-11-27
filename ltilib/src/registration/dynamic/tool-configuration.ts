import { ToolConfigurationSupportedMessage } from "./supported-message";

export type GrantType = "implicit" | "client_credentials";
export type ResponseType = "id_token";
export type Contact = `${string}@${string}.${string}`;

export const LTI_TOOL_CONFIGURATION_KEY =
  "https://purl.imsglobal.org/spec/lti-tool-configuration";

/**
 * This interface describes the data sent by the Tool in a client registration
 * request. Platform must use this to navigate through the body and persist this data.
 *
 * See:
 * - https://www.imsglobal.org/spec/lti-dr/v1p0#tool-configuration
 * - https://openid.net/specs/openid-connect-registration-1_0-errata2.html
 */
export type DraftLtiDynamicToolConfiguration = {
  client_id?: string;
  application_type: "web";
  grant_types: [
    "implicit" | "client_credentials",
    "implicit" | "client_credentials",
    ...GrantType[],
  ];
  response_types: ["id_token", ...ResponseType[]];
  redirect_uris: string[];
  initiate_login_uri: string;
  client_name: string;
  jwks_uri: string;
  logo_uri?: string;
  token_endpoint_auth_method: "private_key_jwt";
  contacts?: Contact[];
  client_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  scope: string;
  /**
   * See: https://www.imsglobal.org/spec/lti-dr/v1p0#lti-configuration-0
   */
  [LTI_TOOL_CONFIGURATION_KEY]: {
    domain: string;
    secondary_domains?: string[];
    deployment_id?: string;
    target_link_uri: string;
    description?: string;
    /**
     * See: https://www.imsglobal.org/spec/lti-dr/v1p0#lti-message
     */
    messages: ToolConfigurationSupportedMessage[];
    claims: string[];
    custom_parameters?: Record<string, string>;
  };
};

/**
 * Represents a stored configuration from some registered LTI tool. Platforms
 * must return this type after registering a LTI tool and everytime a tool requests
 * its configuration within the platform.
 */
export type LtiDynamicToolConfiguration = DraftLtiDynamicToolConfiguration & {
  client_id: string;
};
