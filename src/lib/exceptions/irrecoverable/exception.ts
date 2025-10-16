import { HttpStatus } from "@nestjs/common";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { BaseException } from "../base/exception";

export class IrrecoverableException extends BaseException {
  public constructor(public error: IrrecoverableError) {
    console.error(error);
    super(error, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
