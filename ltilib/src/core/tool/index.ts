import { either as e } from "fp-ts";
import { IntoLtiClaim } from "$/claims/serialization";
import {
  Contact,
  DraftLtiDynamicToolConfiguration,
  GrantType,
  LTI_TOOL_CONFIGURATION_KEY,
  LtiDynamicToolConfiguration,
  ResponseType,
} from "$/registration/dynamic/tool-configuration";
import { InvalidToolConfigurationError } from "$/registration/errors/invalid-tool-configuration.error";
import * as toolNamespace from "./namespace";

interface ILtiTool {
  readonly id?: string;
  // the two properties below will never be assigned from the input upon instantiation,
  // however, asking them to be input allow us to ensure they have these values strictly,
  // what is required by LTI specs.
  applicationType: "web";
  tokenEndpointAuthMethod: "private_key_jwt";
  name: string;
  responseTypes: ResponseType[];
  grantTypes: GrantType[];
  initiateUrl: URL;
  jwksUrl: URL;
  // this must be `string[]` instead of `URL[]`, because `URL` performs some normalization
  // to the input, what might cause problems in future checks since LTI states that,
  // during a launch, the given `redirect_uri` must have been previously registered
  // (in the below property), and this must be a char-by-char comparison.
  redirectUrls: string[];
  homePageUrl?: URL;
  logoUrl?: URL;
  termsOfServiceUrl?: URL;
  policyUrl?: URL;
  scopes: string[];
  contacts?: Contact[];
  domain: string;
  description?: string;
  deploymentsIds: string[];
  targetLinkUri: URL;
  customParameters?: Record<string, string>;
  /**
   * Every placement in which the supported message shall be
   * available at MUST be declared on one single {@link ToolSupportedMessage}
   * `placements` property.
   */
  messages: LtiTool.SupportedMessage[];
  claims: string[];
  clientSecret?: string;
}

export class LtiTool implements ILtiTool, IntoLtiClaim {
  public readonly applicationType: "web" = "web";
  public readonly tokenEndpointAuthMethod: "private_key_jwt" = "private_key_jwt";
  public readonly id: string;
  public grantTypes: GrantType[];
  public initiateUrl: URL;
  public jwksUrl: URL;
  public redirectUrls: string[];
  public homePageUrl?: URL | undefined;
  public logoUrl?: URL | undefined;
  public termsOfServiceUrl?: URL | undefined;
  public policyUrl?: URL | undefined;
  public scopes: string[];
  public contacts?: `${string}@${string}.${string}`[] | undefined;
  public domain: string;
  public description?: string | undefined;
  public deploymentsIds: string[];
  public targetLinkUri: URL;
  public customParameters?: Record<string, string> | undefined;
  public messages: LtiTool.SupportedMessage[];
  public claims: string[];
  public clientSecret?: string | undefined;
  public name: string;
  public responseTypes: ResponseType[];

  protected constructor(args: ILtiTool) {
    Object.assign(this, args);

    // ensure url fields are instances of URL
    this.jwksUrl = new URL(args.jwksUrl);
    this.initiateUrl = new URL(args.initiateUrl);
    this.targetLinkUri = new URL(args.targetLinkUri);
    if (args.logoUrl) this.logoUrl = new URL(args.logoUrl);
    if (args.policyUrl) this.policyUrl = new URL(args.policyUrl);
    if (args.homePageUrl) this.homePageUrl = new URL(args.homePageUrl);
    if (args.termsOfServiceUrl) this.termsOfServiceUrl = new URL(args.termsOfServiceUrl);
  }

  /**
   * Creates an instance of `LtiTool` validating the constraints stated by
   * [section 2.2.1 of LTI Dynamic Registration specification].
   *
   * [section 2.2.1 of LTI Dynamic Registration specification]: https://www.imsglobal.org/spec/lti-dr/v1p0#openid-configuration-0
   */
  public static create(data: ILtiTool) {
    const hasNoJwksUrlNorClientSecret = !data.jwksUrl && !data.clientSecret;
    const hasInvalidApplicationType = data.applicationType !== "web";
    const hasInvalidTokenEndpointAuthMethod = data.tokenEndpointAuthMethod !== "private_key_jwt";
    const hasInvalidRedirectUri = data.redirectUrls.some((url) => {
      // looks for the first invalid redirect_uri to declare that there is a validation error
      try {
        new URL(url);
        return false;
      } catch (_) {
        return true;
      }
    });

    const inputGrantTypes = new Set(data.grantTypes);
    const isMissingMandatoryGrantType =
      !inputGrantTypes.has("implicit") || !inputGrantTypes.has("client_credentials");

    const isMissingMandatoryResponseType = !data.responseTypes.includes("id_token");

    if (isMissingMandatoryResponseType) {
      const errorMsg = "Tool must handle 'id_token' response type";
      const error = new InvalidToolConfigurationError({ response_types: errorMsg });
      return e.left(error);
    }

    if (isMissingMandatoryGrantType) {
      const errorMsg = "Tool must have both 'implicit' and 'client_credentials' grant types";
      const error = new InvalidToolConfigurationError({ grant_types: errorMsg });
      return e.left(error);
    }

    if (hasNoJwksUrlNorClientSecret) {
      const errorMsg = "Tool must have at least `client_secret` if `jwks_uri` is not present";
      const error = new InvalidToolConfigurationError({ client_secret: errorMsg });
      return e.left(error);
    }

    if (hasInvalidApplicationType) {
      const errorMsg = "LTI Tools must have `application_type` set to 'web'";
      const error = new InvalidToolConfigurationError({ application_type: errorMsg });
      return e.left(error);
    }

    if (hasInvalidTokenEndpointAuthMethod) {
      const errorMsg = "LTI Tool must have `token_endpoint_auth_method` set to 'private_key_jwt'";
      const error = new InvalidToolConfigurationError({ token_endpoint_auth_method: errorMsg });
      return e.left(error);
    }

    if (hasInvalidRedirectUri) {
      const errorMsg = "Every `redirect_uri` must be a valid URI";
      const error = new InvalidToolConfigurationError({ redirect_uris: errorMsg });
      return e.left(error);
    }

    return e.right(new LtiTool(data));
  }

  public static createUnchecked(data: ILtiTool) {
    return new LtiTool(data);
  }

  /**
   * Serializes this record in a tool configuration response, as specified in
   * [section 3.6.1 Successful Registration].
   *
   * [section 3.6.1 Successful Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#successful-registration
   */
  public intoLtiClaim(): LtiDynamicToolConfiguration {
    return {
      client_id: this.id.toString(),
      application_type: this.applicationType,
      client_name: this.name,
      grant_types: this.grantTypes as DraftLtiDynamicToolConfiguration["grant_types"],
      jwks_uri: this.jwksUrl.toString(),
      redirect_uris: this.redirectUrls,
      initiate_login_uri: this.initiateUrl.toString(),
      response_types: this.responseTypes as DraftLtiDynamicToolConfiguration["response_types"],
      scope: this.scopes.join(" "),
      token_endpoint_auth_method: this.tokenEndpointAuthMethod,
      contacts: this.contacts?.length === 0 ? undefined : this.contacts,
      logo_uri: this.logoUrl?.toString(),
      policy_uri: this.policyUrl?.toString(),
      tos_uri: this.termsOfServiceUrl?.toString(),
      client_uri: this.homePageUrl?.toString(),
      [LTI_TOOL_CONFIGURATION_KEY]: {
        claims: this.claims,
        domain: this.domain,
        messages: this.messages,
        target_link_uri: this.targetLinkUri?.toString(),
        custom_parameters: this.customParameters,
        description: this.description,
      },
    };
  }
}

export namespace LtiTool {
  export const { MessagePlacement, ToolSupportedMessage } = toolNamespace;

  export type ISupportedMessage = toolNamespace.IToolSupportedMessage;
  export type SupportedMessage = toolNamespace.ToolSupportedMessage;
  export type MessagePlacement = toolNamespace.MessagePlacement;
}
