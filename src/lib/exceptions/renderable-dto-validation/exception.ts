import { HttpException, HttpStatus } from "@nestjs/common";
import { ValidationErrors } from "@/core/validation/validation-errors";

export class RenderableDtoValidationException extends HttpException {
  public constructor(
    public validationErrors: ValidationErrors,
    public view: string,
  ) {
    super(validationErrors, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
