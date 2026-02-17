import { ErrorBase, ErrorClassProperties } from "./error-base";

export class ResourceNotFoundError extends ErrorBase {
  public constructor(properties: Required<ErrorClassProperties<ResourceNotFoundError>>) {
    super(properties, ResourceNotFoundError.name);
  }
}
