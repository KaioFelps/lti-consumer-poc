import { ErrorBase, ErrorClassProperties } from "./error-base.js";

export class ResourceNotFoundError extends ErrorBase {
  public constructor(properties: Required<ErrorClassProperties<ResourceNotFoundError>>) {
    super(properties, ResourceNotFoundError.name);
  }
}
