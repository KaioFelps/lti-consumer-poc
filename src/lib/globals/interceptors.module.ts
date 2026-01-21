import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AsyncRenderInterceptor } from "../async-render/interceptor";
import coreValidation from "../core-validation";

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: coreValidation.Interceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AsyncRenderInterceptor,
    },
  ],
})
export class GlobalInterceptorsModule {}
