import { HttpStatus } from "@nestjs/common";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { BaseException } from "../base/exception.js";

export class IrrecoverableException extends BaseException<IrrecoverableError> {
  public constructor(public error: IrrecoverableError) {
    console.error(error);
    super(error, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
