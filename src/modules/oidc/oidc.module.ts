import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import Provider from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import middlewares from "@/lib/middlewares";
import { AuthModule } from "@/modules/auth/auth.module";
import { AuthJwkSet } from "@/modules/auth/encryption/jwks-set";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository";
import { OIDCAdapterFactory } from "@/modules/oidc/adapter/factory";
import { OIDCAdapterModule } from "./adapter/adapter.module";
import { OIDCController } from "./oidc.controller";
import { OIDCProviderFactory } from "./provider.factory";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { OIDCClientsRepository } from "./repositories/clients.repository";

@Module({
  imports: [AuthModule, OIDCAdapterModule],
  controllers: [OIDCController],
  providers: [
    {
      provide: Provider,
      useFactory: (
        envVars: EnvironmentVars,
        clientsRepository: OIDCClientsRepository,
        ltiToolsRepository: LtiToolsRepository,
        oidcAccountsRepository: OIDCAccountsRepository,
        oidcAdapterFactory: OIDCAdapterFactory,
        jwks: AuthJwkSet,
      ) =>
        new OIDCProviderFactory(
          envVars,
          clientsRepository,
          ltiToolsRepository,
          oidcAccountsRepository,
          oidcAdapterFactory,
          jwks,
        ).create(),
      inject: [
        EnvironmentVars,
        OIDCClientsRepository,
        LtiToolsRepository,
        OIDCAccountsRepository,
        OIDCAdapterFactory,
        AuthJwkSet,
      ],
    },
  ],
  exports: [Provider],
})
export class OIDCModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes("/oidc/interaction/*path");
  }
}
