import { HttpStatus } from "@nestjs/common";
import { ErrorClassProperties } from "../error-base.js";
import { RenderableError } from "./renderable-error.js";

type Args = Omit<ErrorClassProperties<RenderableUnauthorizedError>, "status">;

export class RenderableUnauthorizedError extends RenderableError {
  public constructor(args: Args) {
    super({ ...args, status: HttpStatus.UNAUTHORIZED }, RenderableUnauthorizedError.name);
  }
}
