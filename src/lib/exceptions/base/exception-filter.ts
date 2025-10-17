import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
  Scope,
} from "@nestjs/common";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter";
import { HttpResponse } from "@/lib";
import { BaseException } from "./exception";

@Injectable({ scope: Scope.REQUEST })
@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
  @Inject()
  private presenter: SimpleExceptionPresenter<BaseException>;

  async catch(exception: BaseException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const status = exception.getStatus();
    response.status(status).json(await this.presenter.present(exception));
  }
}
