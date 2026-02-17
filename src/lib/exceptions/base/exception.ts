import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorBase } from "@/core/errors/error-base";

/**
 * This exception may decorate any core error that inherits
 * `ErrorBase` without adding many relevant properties.
 *
 * Its filter will simply translate the message and present it
 * using `SimpleErrorPresenter`.
 *
 * In addition to it, **other exceptions should extend it** to
 * be presentable by `SimpleErrorPresenter`. Some extensions
 * may not fit in, and therefore must implement their own
 * presenters and filters.
 */
export class BaseException<E extends ErrorBase = ErrorBase> extends HttpException {
  public constructor(
    public error: E,
    status: HttpStatus,
  ) {
    super(error, status);
  }
}
