import { Global, Module } from "@nestjs/common";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter.js";
import { BaseExceptionModule } from "../exceptions/base/base-exception.module.js";
import { DtoValidationModule } from "../exceptions/dto-validation/dto-validation.module.js";
import { LtilibExceptionModule } from "../exceptions/ltilib/ltilib-exceptions.module.js";
import { RenderableExceptionModule } from "../exceptions/renderable/renderable-exception.module.js";
import { RenderableDtoValidationModule } from "../exceptions/renderable-dto-validation/renderable-dto-validation.module.js";

@Global()
@Module({
  imports: [
    BaseExceptionModule,
    DtoValidationModule,
    RenderableExceptionModule,
    RenderableDtoValidationModule,
    LtilibExceptionModule,
  ],
  providers: [SimpleExceptionPresenter],
  exports: [SimpleExceptionPresenter],
})
export class GlobalExceptionFiltersModule {}
