import {
  ValidationError,
  ValidationErrorsMap,
} from "@/core/validation/validation-errors";
import { TranslatorService } from "@/message-string/translator.service";

export type SerializedValidationError = {
  message: string;
  argumentName: string;
};

export type SerializedValidationErrorsMap = Record<
  string,
  SerializedValidationError[] | { [key: string]: SerializedValidationErrorsMap }
>;

export async function serializeValidationError(
  error: ValidationErrorsMap,
  translator: TranslatorService,
): Promise<SerializedValidationErrorsMap | Array<SerializedValidationError>> {
  if (Array.isArray(error)) {
    const errors = error as ValidationError[];
    const serializedErrors: SerializedValidationError[] = await Promise.all(
      errors.map(serializeFinalValidationError.bind({ translator })),
    );
    return serializedErrors;
  }

  const tmpMap = {};
  for (const [segment, _errorsMap] of Object.entries(error)) {
    const errorsMap = _errorsMap as ValidationErrorsMap;
    tmpMap[segment] = await serializeValidationError(errorsMap, translator);
  }

  return tmpMap;
}

export async function serializeFinalValidationError(
  error: Required<ValidationError>,
): Promise<SerializedValidationError> {
  const { errorMessageIdentifier, argumentName, messageParams } = error;
  return {
    message: await this.translator.translate(
      errorMessageIdentifier,
      messageParams,
    ),
    argumentName,
  };
}
