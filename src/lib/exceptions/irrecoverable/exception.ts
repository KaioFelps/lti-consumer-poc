import { HttpException, HttpStatus } from "@nestjs/common";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";

export class IrrecoverableException extends HttpException {
  public constructor(public error: IrrecoverableError) {
    super(error, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
