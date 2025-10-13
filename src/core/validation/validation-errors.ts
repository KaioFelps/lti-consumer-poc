import { InvalidArgumentError } from "../errors/invalid-argument.error";

export type ValidationError = InvalidArgumentError;

export type ValidationErrorsMap = Record<
  string,
  ValidationError[] | { [key: string]: ValidationErrorsMap }
>;

export class ValidationErrors {
  private errors: ValidationErrorsMap;

  public constructor() {
    this.errors = {};
  }

  public getErrors() {
    return this.errors;
  }

  public appendError(error: ValidationError) {
    if (!this.ensureErrorRequiredFields(error)) return;
    const path = error.argumentName.split(".");
    this.recursivelyInsertError(error, path);
  }

  private recursivelyInsertError(
    error: Required<ValidationError>,
    path: string[],
  ) {
    let errorsWindow = this.errors;
    const lastSegment = path[path.length - 1];
    path = path.slice(0, path.length - 1);

    for (const segment of path) {
      if (!errorsWindow[segment]) errorsWindow[segment] = {};
      errorsWindow = errorsWindow[segment] as ValidationErrorsMap;
    }

    if (!errorsWindow[lastSegment]) errorsWindow[lastSegment] = [];

    (errorsWindow[lastSegment] as ValidationError[]).push(error);
  }

  public isEmpty() {
    return Object.keys(this.errors).length === 0;
  }

  public merge(valiationErrors: ValidationErrors) {
    this.errors = { ...this.errors, ...valiationErrors.errors };
  }

  private ensureErrorRequiredFields(
    error: InvalidArgumentError,
  ): error is Required<InvalidArgumentError> {
    if (typeof error.argumentName === "undefined")
      throw new Error(
        "Every validation error's `InvalidArgumentError` instance needs to have a defined `argumentName` value.",
      );

    return true;
  }
}
