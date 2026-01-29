import { HttpStatus } from "@nestjs/common";
import { ErrorClassProperties } from "../error-base";
import { RenderableError } from "./renderable-error";

type Args = Omit<ErrorClassProperties<RenderableUnauthorizedError>, "status">;

export class RenderableUnauthorizedError extends RenderableError {
  public constructor(args: Args) {
    super(
      { ...args, status: HttpStatus.UNAUTHORIZED },
      RenderableUnauthorizedError.name,
    );
  }
}
