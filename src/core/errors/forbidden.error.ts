import { ErrorBase, ErrorClassProperties } from "./error-base";

export class ForbiddenError extends ErrorBase {
  public constructor(properties: ErrorClassProperties<ForbiddenError>) {
    super(properties, ForbiddenError.name);
  }
}
