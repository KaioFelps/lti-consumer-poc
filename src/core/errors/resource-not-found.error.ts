import { ErrorBase, ErrorClassProperties } from "./error-base";

export class ResourceNotFoundError extends ErrorBase {
  /**
   * Custom parameters that the message string may use to format
   * the message.
   */
  public messageParams: Record<string, string | number | boolean> = {};

  public constructor(properties: ErrorClassProperties<ResourceNotFoundError>) {
    const { messageParams, ...superProperties } = properties;
    super(superProperties, ResourceNotFoundError.name);
    this.messageParams = messageParams;
  }
}
