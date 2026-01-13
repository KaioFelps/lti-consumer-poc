import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import Provider from "oidc-provider";
import { AuthModule } from "@/auth/auth.module";
import { AuthJwkSet } from "@/auth/encryption/jwks-set";
import { EnvironmentVars } from "@/config/environment-vars";
import middlewares from "@/lib/middlewares";
import { LtiToolsRepository } from "@/lti/tools/lti-tools.repository";
import { OIDCAdapterFactory } from "@/oidc/adapter/factory";
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
