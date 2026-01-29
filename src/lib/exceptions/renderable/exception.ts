import { HttpException } from "@nestjs/common";
import { RenderableError } from "@/core/errors/renderable/renderable-error";

export class RenderableException extends HttpException {
  public constructor(public error: RenderableError) {
    super(error, error.status);
  }
}
