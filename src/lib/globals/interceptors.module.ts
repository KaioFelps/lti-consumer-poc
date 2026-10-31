import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AsyncRenderInterceptor } from "../async-render/interceptor.js";
import { CoreValidationInterceptor } from "../core-validation/interceptor.js";

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CoreValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AsyncRenderInterceptor,
    },
  ],
})
export class GlobalInterceptorsModule {}
