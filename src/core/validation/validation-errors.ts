import { InvalidArgumentError } from "../errors/invalid-argument.error";

export type ValidationError =
  | InvalidArgumentError
  | {
      [key: string]: ValidationError;
    };

export class ValidationErrors {
  private errors: ValidationError[];

  public constructor() {
    this.errors = [];
  }

  public appendError(error: ValidationError) {
    this.errors.push(error);
  }

  public isEmpty() {
    return this.errors.length === 0;
  }

  public merge(valiationErrors: ValidationErrors) {
    this.errors = [...this.errors, ...valiationErrors.errors];
  }
}
