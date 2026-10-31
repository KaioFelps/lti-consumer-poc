import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "@/modules/auth/auth.module.js";
import { IdentityModule } from "@/modules/identity/identity.module.js";
import { LtiModule } from "@/modules/lti/lti.module.js";
import { OIDCModule } from "@/modules/oidc/oidc.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AppConfigModule } from "./config/config.module.js";
import { ExternalModule } from "./external/external.module.js";
import { GlobalExceptionFiltersModule } from "./lib/globals/exception-filters.module.js";
import { GlobalGuardsModule } from "./lib/globals/guards.module.js";
import { GlobalInterceptorsModule } from "./lib/globals/interceptors.module.js";
import { GlobalPipesModule } from "./lib/globals/pipes.module.js";
import middlewares from "./lib/middlewares.js";
import { MessageStringModule } from "./message-string/message-string.module.js";
import { AssignmentsAndGradesModule } from "./modules/assignments-and-grades/assignments-and-grades.module.js";
import { CoursesModule } from "./modules/courses-and-enrollments/courses.module.js";

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
    CoursesModule,
    AssignmentsAndGradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(AppController);
  }
}
