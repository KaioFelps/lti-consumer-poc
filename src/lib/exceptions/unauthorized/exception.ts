import { HttpException, HttpStatus } from "@nestjs/common";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";

export class UnauthorizedException extends HttpException {
  public constructor(public error: UnauthorizedError) {
    super(error, HttpStatus.UNAUTHORIZED);
  }
}
