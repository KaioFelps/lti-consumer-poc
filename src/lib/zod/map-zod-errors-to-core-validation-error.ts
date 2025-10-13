import { ZodError } from "zod";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { ValidationErrors } from "@/core/validation/validation-errors";

export function mapZodErrorsToCoreValidationErrors(errors: ZodError) {
  const validationErrors = new ValidationErrors();

  for (const error of errors.issues) {
    const validationError = new InvalidArgumentError(
      error.message,
      error.path.join("."),
    );

    validationErrors.appendError(validationError);
  }

  return validationErrors;
}
