import { ClassProperties } from "common/src/types/class-properties";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "$/registration/enums/message-placement";

export interface IOpenIdConfiguration {
  /**
   * Platform's issuer value. Must be a URL using HTTPS scheme and contain no
   * query or fragment components.
   *
   * Note that, if using some oidc library (such as `oidc-provider`) and relying on it
   * for processes related to LTI (i.e., dynamic registration), the issuer value should
   * be the same as used in the library.
   */
  issuer: string;
  /**
   * URL of the OAuth 2.0 Authorization Endpoint.
   */
  authorizationEndpoint: URL;
  /**
   * URL of the registration endpoint.
   */
  registrationEndpoint: URL;
  /**
   * URL of the JWK Set endpoint.
   */
  jwksEndpoint: URL;
  token: {
    /**
     * URL of the endpoint for the tool to request a token to access LTI services.
     */
    endpoint: URL;
    /**
     * Optional extra auth methods supported, as specified by OpenID Connect.
     * Note that `private_key_jwt` is included by default and thus must not be
     * added as an extra method.
     *
     * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
     */
    extraAuthMethodsSupported?: string[];
    /**
     * Optional extra signing algorithm values supported, as specified by OpenID Connect.
     * Note that `RS256` is included by default and thus must not be added as a value of
     * this property.
     *
     * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
     */
    extraSigningAlgValuesSupported?: string[];
  };
  /**
   * Extra supported OpenID scopes. `openid` is included by default and thus must not be
   * added in this property.
   *
   * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
   */
  extraScopesSupported?: string[];
  /**
   * Extra response types supported by the platform. `id_token` is included
   * by default and thus must not be added in this property.
   *
   * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
   */
  extraResponseTypesSupported?: string[];
  /**
   * Extra supported algorithms for Id Token signing. `RS256` is included by
   * default and thus must not be added as a value of this property.
   *
   * Note that LTI requires the use of asymmetric cryptographic signing algorithms.
   *
   * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
   */
  extraIdTokenSigningAlgValuesSupported?: string[];
  /**
   * OpenID claims supported by this platform. Any claim related specifically to
   * LTI should not be included, since it's inferred by the message types.
   *
   * @see {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata}
   */
  claimsSupported: string[];
  /**
   * Whether the platform supports pairwise subject indentifier (i.e., different identifiers
   * are provided to different tools to refer to a same end user).
   *
   * @default false
   */
  supportPairwiseSubjectType?: boolean;
  /**
   * The authorization server URL to be used as the `aud` claim
   * from `id_token`s when requesting an access token. If not specified,
   * the token endpoint itself will be used as the `aud` value.
   */
  authorizationServer?: URL;
  /**
   * Name of the LMS within its vendor products. I.e., "moodle".
   */
  productFamilyCode: string;
  /**
   * Version of the LMS.
   */
  version: string;
  messagesSupported: {
    type: MessageType;
    placements?: (MessagePlacement.ContentArea | MessagePlacement.RichTextEditor)[];
  }[];
  /**
   * An optional list of variables available for variable substitution parameters.
   * See:
   * - [Custom properties and variable substitution]
   * - [Available custom variables and how to handle them]
   *
   * [Custom properties and variable substitution]: https://www.imsglobal.org/spec/lti/v1p3#custom-properties-and-variable-substitution
   * [Available custom variables and how to handle them]: https://www.imsglobal.org/spec/lti/v1p3#customproperty
   */
  variables?: string[];
}

/**
 * LTI-specific & minimal OpenID configuration defined by [LTI Dynamic Linking] specification.
 * These data should be made available in the Authorization Server webfingers endpoint for
 * the OpenID configuration.
 *
 * [LTI Dynamic Linking]: https://www.imsglobal.org/spec/lti-dr/v1p0
 */
export class OpenIdConfiguration implements IOpenIdConfiguration {
  public readonly issuer: string;
  private constructor(metadata: ClassProperties<OpenIdConfiguration>) {
    Object.assign(this, metadata);
  }
  public readonly authorizationEndpoint: URL;
  public readonly registrationEndpoint: URL;
  public readonly jwksEndpoint: URL;
  public readonly token: IOpenIdConfiguration["token"];
  public readonly extraScopesSupported?: string[] | undefined;
  public readonly extraResponseTypesSupported?: string[] | undefined;
  public readonly extraIdTokenSigningAlgValuesSupported?: string[] | undefined;
  public readonly claimsSupported: string[];
  public readonly supportPairwiseSubjectType?: boolean | undefined;
  public readonly authorizationServer?: URL | undefined;
  public readonly productFamilyCode: string;
  public readonly version: string;
  public readonly messagesSupported: {
    type: MessageType;
    placements?: (MessagePlacement.ContentArea | MessagePlacement.RichTextEditor)[];
  }[];
  public readonly variables?: string[] | undefined;

  public static create(metadata: ClassProperties<OpenIdConfiguration>) {
    return new OpenIdConfiguration(metadata);
  }

  public intoConfiguration() {
    return {
      issuer: this.issuer,
      authorization_endpoint: this.authorizationEndpoint.toString(),
      registration_endpoint: this.registrationEndpoint.toString(),
      jwks_uri: this.jwksEndpoint.toString(),
      token_endpoint: this.token.endpoint.toString(),
      token_endpoint_auth_methods_supported: [
        "private_key_jwt",
        ...(this.token.extraAuthMethodsSupported ?? []),
      ],
      token_endpoint_auth_signing_alg_values_supported: [
        "RS256",
        ...(this.token.extraSigningAlgValuesSupported ?? []),
      ],
      scopes_supported: ["openid", ...(this.extraScopesSupported ?? [])],
      response_types_supported: ["id_token", ...(this.extraResponseTypesSupported ?? [])],
      id_token_signing_alg_values_supported: [
        "RS256",
        ...(this.extraIdTokenSigningAlgValuesSupported ?? []),
      ],
      claims_supported: this.claimsSupported,
      subject_types_supported: [
        "public",
        ...(this.supportPairwiseSubjectType === true ? ["pairwise"] : []),
      ],

      authorization_server: this.authorizationServer?.toString(),
      ["https://purl.imsglobal.org/spec/lti-platform-configuration"]: {
        product_family_code: this.productFamilyCode,
        version: this.version,
        messages_supported: this.messagesSupported,
        variables: this.variables,
      },
    };
  }
}
