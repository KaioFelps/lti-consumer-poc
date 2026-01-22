import { Inject, Injectable, Scope } from "@nestjs/common";
import Provider from "oidc-provider";
import { AuthJwkSet } from "@/auth/encryption/jwks-set";
import { Routes } from "@/routes";
import { Platform } from "$/core/platform";

@Injectable({ scope: Scope.DEFAULT })
export class PlatformFactory {
  @Inject()
  private jwks: AuthJwkSet;

  @Inject()
  private provider: Provider;

  public create() {
    return Platform.create({
      issuer: this.provider.issuer,
      jsonWebKey: this.jwks.privateJwk,
      initiateLaunchEndpoint: Routes.lti.resourceLinks.initiateLaunch,
    });
  }
}
