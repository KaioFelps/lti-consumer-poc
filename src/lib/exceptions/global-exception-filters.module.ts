import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter";
import { BaseExceptionFilter } from "./base/exception-filter";
import { DTOValidationExceptionFilter } from "./dto-validation/exception-filter";

@Global()
@Module({
  providers: [
    SimpleExceptionPresenter,
    { provide: APP_FILTER, useClass: DTOValidationExceptionFilter },
    {
      provide: APP_FILTER,
      useClass: BaseExceptionFilter,
    },
  ],
})
export class GlobalExceptionFiltersModule {}
