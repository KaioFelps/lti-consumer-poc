import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { RenderableExceptionFilter } from "./exception-filter";
import { RenderableExceptionFilterResponderFactory } from "./responder.factory";

@Module({
  providers: [
    RenderableExceptionFilterResponderFactory,
    {
      provide: APP_FILTER,
      useClass: RenderableExceptionFilter,
    },
    RenderableExceptionFilter,
  ],
  exports: [RenderableExceptionFilter],
})
export class RenderableExceptionModule {}
