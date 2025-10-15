import { ErrorBase, ErrorClassProperties } from "./error-base";

export class UnauthorizedError extends ErrorBase {
  public constructor(properties: ErrorClassProperties<UnauthorizedError>) {
    super(properties, UnauthorizedError.name);
  }
}
