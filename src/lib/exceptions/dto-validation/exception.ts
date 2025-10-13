import { HttpException, HttpStatus } from "@nestjs/common";
import { ValidationErrors } from "@/core/validation/validation-errors";

export class DTOValidationException extends HttpException {
  public constructor(public validationErrors: ValidationErrors) {
    super(validationErrors, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
