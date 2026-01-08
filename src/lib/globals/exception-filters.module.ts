import { Global, Module } from "@nestjs/common";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter";
import { BaseExceptionModule } from "../exceptions/base/base-exception.module";
import { DtoValidationModule } from "../exceptions/dto-validation/dto-validation.module";
import { RenderableExceptionModule } from "../exceptions/renderable/renderable-exception.module";

@Global()
@Module({
  imports: [
    BaseExceptionModule,
    DtoValidationModule,
    RenderableExceptionModule,
  ],
  providers: [SimpleExceptionPresenter],
  exports: [SimpleExceptionPresenter],
})
export class GlobalExceptionFiltersModule {}
