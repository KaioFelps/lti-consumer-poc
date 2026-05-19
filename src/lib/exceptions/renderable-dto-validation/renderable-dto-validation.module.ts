import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { RenderableExceptionModule } from "../renderable/renderable-exception.module";
import { RenderableDtoValidationExceptionFilter } from "./exception-filter";

@Module({
  imports: [RenderableExceptionModule],
  providers: [
    RenderableDtoValidationExceptionFilter,
    {
      provide: APP_FILTER,
      useExisting: RenderableDtoValidationExceptionFilter,
    },
  ],
  exports: [RenderableDtoValidationExceptionFilter],
})
export class RenderableDtoValidationModule {}
