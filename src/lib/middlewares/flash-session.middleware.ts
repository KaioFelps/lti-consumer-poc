import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { TranslatorService } from "@/message-string/translator.service";
import { HttpRequest, HttpResponse } from "..";

@Injectable()
export class SessionsAndFlashMessagesMiddleware implements NestMiddleware {
  @Inject()
  private readonly t: TranslatorService;

  async use(
    request: HttpRequest,
    response: HttpResponse,
    next: (error?: unknown) => void,
  ) {
    const session = request["session"] as Record<string, unknown>;

    // injects locales
    response.locals.locale = this.t.getLocale();

    // explicitly "define" them as undefined, so that EJS won't throw errors
    response.locals.error = session.error ?? undefined;
    response.locals.flash = session.flash ?? {};
    response.locals.validationErrors = session.validationErrors ?? undefined;

    delete session.error;
    delete session.validationErrors;
    session.flash = {};

    return next();
  }
}
