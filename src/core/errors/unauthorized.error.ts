import { ErrorBase, ErrorClassProperties } from "./error-base.js";

export class UnauthorizedError extends ErrorBase {
  public constructor(properties: ErrorClassProperties<UnauthorizedError>) {
    super(properties, UnauthorizedError.name);
  }
}
