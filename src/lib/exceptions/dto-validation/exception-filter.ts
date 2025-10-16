import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  Scope,
} from "@nestjs/common";
import {
  ValidationError,
  ValidationErrorsMap,
} from "@/core/validation/validation-errors";
import { TranslatorService } from "@/message-string/translator.service";
import { HttpResponse } from "../..";
import { DTOValidationException } from "./exception";

type SerializedValidationError = { message: string; argumentName: string };

type SerializedValidationErrorsMap = Record<
  string,
  | Array<SerializedValidationError>
  | { [key: string]: SerializedValidationErrorsMap }
>;

/**
 * This exception filter translates and present every (nested) error from a
 * `DTOValidationException` thrown by some handler across the application.
 */
@Injectable({ scope: Scope.REQUEST })
@Catch(DTOValidationException)
export class DTOValidationExceptionFilter implements ExceptionFilter {
  public constructor(private readonly translator: TranslatorService) {}

  async catch(exception: DTOValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const status = exception.getStatus();

    const errors = await this.serializeValidationError(
      exception.validationErrors.getErrors(),
    );

    response.status(status).json({ errors, status });
  }

  private async serializeValidationError(
    error: ValidationErrorsMap,
  ): Promise<SerializedValidationErrorsMap | Array<SerializedValidationError>> {
    if (Array.isArray(error)) {
      const errors = error as ValidationError[];
      const serializedErrors: SerializedValidationError[] = await Promise.all(
        errors.map(this.serializeFinalValidationError.bind(this)),
      );
      return serializedErrors;
    }

    const tmpMap = {};
    for (const [segment, _errorsMap] of Object.entries(error)) {
      const errorsMap = _errorsMap as ValidationErrorsMap;
      tmpMap[segment] = await this.serializeValidationError(errorsMap);
    }

    return tmpMap;
  }

  private async serializeFinalValidationError(
    error: Required<ValidationError>,
  ): Promise<SerializedValidationError> {
    const { errorMessageIdentifier, argumentName } = error;
    return {
      message: await this.translator.translate(errorMessageIdentifier),
      argumentName,
    };
  }
}
