import { Either } from "fp-ts/lib/Either.js";
import { ValidationErrors } from "../validation/validation-errors.js";

export interface DTO {
  /**
   * Validates this `DTO` instance and ensure it's a valid payload.
   */
  validate(): Either<ValidationErrors, void>;
}
