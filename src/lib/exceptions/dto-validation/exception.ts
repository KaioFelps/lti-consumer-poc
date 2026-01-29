import { HttpException, HttpStatus } from "@nestjs/common";
import { ValidationErrors } from "@/core/validation/validation-errors";

/**
 * This is an exception even between exceptions. It does not benefit
 * from inheriting `BaseException`, since it does not decorates any
 * `ErrorBase`. Therefore, it relies on its own presenter and exception filter.
 */
export class DTOValidationException extends HttpException {
  public constructor(
    public validationErrors: ValidationErrors,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super(validationErrors, status);
  }
}
