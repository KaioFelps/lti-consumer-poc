import { HttpStatus } from "@nestjs/common";
import { ErrorClassProperties } from "../error-base";

type Args = ErrorClassProperties<RenderableError>;

type RenderableErrorViewProperties = {
  title: string;
  [key: PropertyKey]: unknown;
};

/**
 * A renderable error is a MVC-only error. Instead of redirecting the user back with errors,
 * this application renders the given `view` with given `viewProperties` (merged with the underlying error).
 */
export class RenderableError {
  public readonly errorType: string;
  public readonly view: string;
  public readonly viewProperties: RenderableErrorViewProperties;
  public readonly status: HttpStatus;

  public constructor(args: Args, errorType: string) {
    Object.assign(this, args);
    this.errorType = errorType;
  }
}
