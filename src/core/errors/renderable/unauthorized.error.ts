import { ErrorClassProperties } from "../error-base";
import { RenderableError } from "./renderable-error";

export class RenderableUnauthorizedError extends RenderableError {
  public constructor(args: ErrorClassProperties<RenderableUnauthorizedError>) {
    super(args, RenderableUnauthorizedError.name);
  }
}
