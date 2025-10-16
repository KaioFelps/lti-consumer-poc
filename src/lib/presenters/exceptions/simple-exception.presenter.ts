import { Inject, Injectable, Scope } from "@nestjs/common";
import { TranslatorService } from "@/message-string/translator.service";
import { BaseException } from "../../exceptions/base/exception";
import { ExceptionPresenter } from "../exception-presenter";

type PresentedSimpleException = {
  readonly error: string;
  readonly status: number;
};

/**
 * A presenter for `SimpleException`s.
 */
@Injectable({ scope: Scope.REQUEST })
export class SimpleExceptionPresenter<E extends BaseException>
  implements ExceptionPresenter<E>
{
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
