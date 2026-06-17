import { Injectable, Scope } from "@nestjs/common";
import Provider from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { AuthJwkSet } from "@/modules/auth/encryption/jwks-set";
import { AvailableScopes } from "@/modules/oidc/consts";
import { Routes } from "@/routes";
import { MessageType } from "$/claims/serialization";
import { Platform } from "$/core/platform";
import { MessagePlacement } from "$/core/tool/message-placement";

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
      initiateLaunchEndpoint: Routes.lti.launch.initiate,
      openIdConfiguration: Platform.OpenIdConfiguration.create({
        issuer: issuer,
        authorizationEndpoint: new URL(Routes.lti.launch.login(), issuer),
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
        extraScopesSupported: AvailableScopes.filter((scope) => scope !== "openid"),
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
      agsConfiguration: Platform.LtiAssignmentAndGradeServicesConfig.create({
        lineItemEndpoint: (ctx, lineItemId) =>
          new URL(
            Routes.lti.ags.lineitems.instance(ctx.id, lineItemId.toString()),
            this.envVars.app.url,
          ),

        lineItemsContainerEndpoint: (context) =>
          new URL(Routes.lti.ags.lineitems.container(context.id), this.envVars.app.url),

        deadlinesEnabled: { end: true, start: true },
      }),
    });
  }
}
