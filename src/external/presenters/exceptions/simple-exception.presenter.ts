import { Inject, Injectable, Scope } from "@nestjs/common";
import { BaseException } from "@/lib/exceptions/base/exception";
import { TranslatorService } from "@/message-string/translator.service";
import { ExceptionPresenter } from "../exception-presenter";

type PresentedSimpleException = {
  readonly error: string;
  readonly status: number;
};

/**
 * A presenter for `SimpleException`s.
 */
@Injectable({ scope: Scope.REQUEST })
export class SimpleExceptionPresenter<E extends BaseException> implements ExceptionPresenter<E> {
  @Inject()
  private translator: TranslatorService;

  public async present(exception: E): Promise<PresentedSimpleException> {
    const error = await this.translator.translate(
      exception.error.errorMessageIdentifier,
      exception.error.messageParams,
    );

    return {
      status: exception.getStatus(),
      error,
    };
  }
}
