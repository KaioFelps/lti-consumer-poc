import { ErrorBase, ErrorClassProperties } from "./error-base.js";

export class BadRequestError extends ErrorBase {
  public constructor(properties: ErrorClassProperties<BadRequestError>) {
    super(properties, BadRequestError.name);
  }
}
