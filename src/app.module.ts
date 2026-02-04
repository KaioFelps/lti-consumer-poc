import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/modules/auth/auth.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { LtiModule } from "@/modules/lti/lti.module";
import { OIDCModule } from "@/modules/oidc/oidc.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfigModule } from "./config/config.module";
import { ExternalModule } from "./external/external.module";
import { GlobalExceptionFiltersModule } from "./lib/globals/exception-filters.module";
import { GlobalGuardsModule } from "./lib/globals/guards.module";
import { GlobalInterceptorsModule } from "./lib/globals/interceptors.module";
import { GlobalPipesModule } from "./lib/globals/pipes.module";
import middlewares from "./lib/middlewares";
import { MessageStringModule } from "./message-string/message-string.module";

@Module({
  imports: [
    AppConfigModule,
    MessageStringModule,
    GlobalPipesModule,
    GlobalGuardsModule,
    GlobalInterceptorsModule,
    GlobalExceptionFiltersModule,
    ExternalModule,
    AuthModule,
    IdentityModule,
    OIDCModule,
    LtiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(AppController);
  }
}
