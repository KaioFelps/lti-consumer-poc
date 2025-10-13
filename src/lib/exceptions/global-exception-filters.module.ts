import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { DTOValidationExceptionFilter } from "./dto-validation/exception-filter";

@Global()
@Module({
  providers: [{ provide: APP_FILTER, useClass: DTOValidationExceptionFilter }],
})
export class GlobalExceptionFiltersModule {}
