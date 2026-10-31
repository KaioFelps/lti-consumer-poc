import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { RenderableDtoValidationModule } from "../renderable-dto-validation/renderable-dto-validation.module.js";
import { DTOValidationExceptionFilter } from "./exception-filter.js";
import { DtoValidationExceptionFilterResponderFactory } from "./responder.factory.js";

@Module({
  imports: [RenderableDtoValidationModule],
  providers: [
    DtoValidationExceptionFilterResponderFactory,
    { provide: APP_FILTER, useClass: DTOValidationExceptionFilter },
  ],
})
export class DtoValidationModule {}
