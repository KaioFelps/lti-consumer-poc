import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import coreValidation from "../core-validation";

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: coreValidation.Interceptor,
    },
  ],
})
export class GlobalInterceptorsModule {}
