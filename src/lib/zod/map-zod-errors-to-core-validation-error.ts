import { ZodError } from "zod";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { MessageStringFormatterArg } from "@/message-string/internal";

export function mapZodErrorsToCoreValidationErrors(errors: ZodError) {
  const validationErrors = new ValidationErrors();

  for (const error of errors.issues) {
    const messageParams = {} as MessageStringFormatterArg;

    switch (error.code) {
      case "too_small":
        messageParams.current = error.input as string | number;
        messageParams.minimum = error.minimum;
        break;
      case "too_big":
        messageParams.current = error.input as string | number;
        messageParams.maximum = error.maximum;
        break;
      case "invalid_value": {
        messageParams.current = error.input as string | number;

        const values = error.values.map((value) => {
          if (typeof value === "symbol") return value.toString();
          return value;
        });

        messageParams.values = values;
        break;
      }
    }

    const validationError = new InvalidArgumentError({
      errorMessageIdentifier: error.message,
      argumentName: error.path.join("."),
      messageParams,
    });

    validationErrors.appendError(validationError);
  }

  return validationErrors;
}
