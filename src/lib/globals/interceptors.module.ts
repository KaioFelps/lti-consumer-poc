import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MvcMarkerInterceptor } from "../interceptors/mvc-marker.interceptor";

@Global()
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: MvcMarkerInterceptor }],
})
export class GlobalInterceptorsModule {}
