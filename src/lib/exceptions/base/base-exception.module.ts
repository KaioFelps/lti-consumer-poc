import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { RenderableExceptionModule } from "../renderable/renderable-exception.module";
import { BaseExceptionFilter } from "./exception-filter";
import { BaseExceptionFilterResponderFactory } from "./responder.factory";

@Module({
  imports: [RenderableExceptionModule],
  providers: [
    BaseExceptionFilterResponderFactory,
    BaseExceptionFilter,
    {
      provide: APP_FILTER,
      useClass: BaseExceptionFilter, // useExisting makes it fail here... dunno y
    },
  ],
  exports: [BaseExceptionFilter],
})
export class BaseExceptionModule {}
