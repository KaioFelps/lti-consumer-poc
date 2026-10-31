import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import Provider from "oidc-provider";
import middlewares from "@/lib/middlewares.js";
import { AuthModule } from "@/modules/auth/auth.module.js";
import { OIDCAdapterModule } from "./adapter/adapter.module.js";
import { OIDCController } from "./oidc.controller.js";
import { OIDCProviderFactory } from "./provider.factory.js";
import { UnsafeOIDCClientsInjectionContainer } from "./unsafe-clients-injection-container.js";

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
