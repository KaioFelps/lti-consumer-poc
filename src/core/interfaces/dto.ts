import { Either } from "fp-ts/lib/Either";
import { ValidationErrors } from "../validation/validation-errors";

export interface DTO {
  /**
   * Validates this `DTO` instance and ensure it's a valid payload.
   */
  validate(): Either<ValidationErrors, void>;
}
