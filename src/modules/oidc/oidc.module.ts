import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import Provider from "oidc-provider";
import middlewares from "@/lib/middlewares";
import { AuthModule } from "@/modules/auth/auth.module";
import { OIDCAdapterModule } from "./adapter/adapter.module";
import { OIDCController } from "./oidc.controller";
import { OIDCProviderFactory } from "./provider.factory";
import { UnsafeOIDCClientsInjectionContainer } from "./unsafe-clients-injection-container";

@Module({
  imports: [AuthModule, forwardRef(() => OIDCAdapterModule)],
  controllers: [OIDCController],
  providers: [
    UnsafeOIDCClientsInjectionContainer,
    OIDCProviderFactory,
    {
      provide: Provider,
      useFactory: (factory: OIDCProviderFactory) => factory.create(),
      inject: [OIDCProviderFactory],
    },
  ],
  exports: [Provider, UnsafeOIDCClientsInjectionContainer],
})
export class OIDCModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes("/oidc/interaction/*path");
  }
}
