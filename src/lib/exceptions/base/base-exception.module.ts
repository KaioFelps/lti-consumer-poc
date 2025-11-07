import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { BaseExceptionFilter } from "./exception-filter";
import { BaseExceptionFilterResponderFactory } from "./responder.factory";

@Module({
  providers: [
    BaseExceptionFilterResponderFactory,
    {
      provide: APP_FILTER,
      useClass: BaseExceptionFilter,
    },
  ],
})
export class BaseExceptionModule {}
