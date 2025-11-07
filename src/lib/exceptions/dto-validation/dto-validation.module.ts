import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { DTOValidationExceptionFilter } from "./exception-filter";
import { DtoValidationExceptionFilterResponderFactory } from "./responder.factory";

@Module({
  providers: [
    DtoValidationExceptionFilterResponderFactory,
    { provide: APP_FILTER, useClass: DTOValidationExceptionFilter },
  ],
})
export class DtoValidationModule {}
