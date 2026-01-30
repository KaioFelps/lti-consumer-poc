import { Injectable, Scope } from "@nestjs/common";
import Provider from "oidc-provider";
import { AuthJwkSet } from "@/auth/encryption/jwks-set";
import { EnvironmentVars } from "@/config/environment-vars";
import { AvailableScopes } from "@/oidc/consts";
import { Routes } from "@/routes";
import { MessageType } from "$/claims/serialization";
import { Platform } from "$/core/platform";
import { MessagePlacement } from "$/registration/enums/message-placement";

@Injectable({ scope: Scope.DEFAULT })
export class PlatformFactory {
  public constructor(
    private readonly jwks: AuthJwkSet,
    private readonly provider: Provider,
    private readonly envVars: EnvironmentVars,
  ) {}

  public create() {
    const issuer = this.provider.issuer;

    return Platform.create({
      jsonWebKey: this.jwks.privateJwk,
      initiateLaunchEndpoint: Routes.lti.resourceLinks.initiateLaunch,
      openIdConfiguration: Platform.OpenIdConfiguration.create({
        issuer: issuer,
        authorizationEndpoint: new URL(Routes.oidc.auth(), issuer),
        jwksEndpoint: new URL(Routes.oidc.jwks(), issuer),
        registrationEndpoint: new URL(Routes.oidc.registration(), issuer),
        token: {
          endpoint: new URL(Routes.oidc.token(), issuer),
        },
        claimsSupported: [
          "email",
          "birthdate",
          "family_name",
          "gender",
          "given_name",
          "locale",
          "name",
          "nickname",
        ],
        extraScopesSupported: AvailableScopes.filter(
          (scope) => scope !== "openid",
        ),
        version: process.env.npm_package_version ?? "development",
        messagesSupported: [
          { type: MessageType.resourceLink },
          {
            type: MessageType.deepLinking,
            placements: [MessagePlacement.ContentArea],
          },
        ],
        productFamilyCode: this.envVars.app.productCode,
      }),
    });
  }
}
