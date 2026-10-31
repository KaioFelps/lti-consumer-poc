import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { RenderableExceptionFilter } from "./exception-filter.js";
import { RenderableExceptionFilterResponderFactory } from "./responder.factory.js";

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
