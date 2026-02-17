import { JWK } from "jose";
import * as platformNamespace from "./namespace";

interface IPlatform {
  /**
   * The platform's private key used to sign JWSs.
   */
  jsonWebKey: JWK;
  /**
   * A resolver to the launch initiation endpoint in the platform.
   */
  initiateLaunchEndpoint: (resourceLinkId: string) => string;
  /**
   * Represents an instance of the platform.
   *
   * @see {@link Platform.Instance}
   * @see {@link https://www.cloudflare.com/learning/cloud/what-is-multitenancy/ Multitenancy}
   */
  instance?: Platform.Instance;
  /**
   * The LTI specific OpenID configuration.
   *
   * @see {@link Platform.OpenIdConfiguration}
   */
  openIdConfiguration: Platform.OpenIdConfiguration;
}

/**
 * Represents a LTI Platform.
 */
export class Platform implements IPlatform {
  /**
   * This platform's public issuer.
   *
   * @see {@link Platform.OpenIdConfiguration.issuer}
   */
  public readonly issuer: string;
  /**
   * The resolved OpenID configuration.
   * Same as `platform.openIdConfiguration.intoConfiguration()`.
   */
  public readonly resolvedOpenIdConfiguration: object;

  public readonly jsonWebKey: JWK;
  public readonly initiateLaunchEndpoint: IPlatform["initiateLaunchEndpoint"];
  public readonly instance?: Platform.Instance | undefined;
  public readonly openIdConfiguration: Platform.OpenIdConfiguration;
  public readonly agsConfiguration?: Platform.LtiAssignmentAndGradeServicesConfig;

  protected constructor(args: IPlatform) {
    Object.assign(this, args);
    this.issuer = args.openIdConfiguration.issuer;
    this.resolvedOpenIdConfiguration = args.openIdConfiguration.intoConfiguration();
  }

  public static create(args: IPlatform) {
    return new Platform(args);
  }
}

export namespace Platform {
  export const { Instance, OpenIdConfiguration, LtiAssignmentAndGradeServicesConfig } =
    platformNamespace;

  export type Instance = platformNamespace.Instance;
  export type OpenIdConfiguration = platformNamespace.OpenIdConfiguration;
  export type LtiAssignmentAndGradeServicesConfig =
    platformNamespace.LtiAssignmentAndGradeServicesConfig;
}
