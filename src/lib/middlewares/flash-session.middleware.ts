import { NestMiddleware } from "@nestjs/common";
import { HttpRequest, HttpResponse } from "..";

export class FlashSessionMiddleware implements NestMiddleware {
  use(
    request: HttpRequest,
    response: HttpResponse,
    next: (error?: unknown) => void,
  ) {
    const session = request["session"] as Record<string, unknown>;

    // explicitly "define" them as undefined, so that EJS won't throw errors
    response.locals.error = session.error ?? undefined;
    response.locals.flash = session.flash ?? {};
    response.locals.validationErrors = session.validationErrors ?? undefined;

    delete session.error;
    delete session.validationErrors;
    delete session.flash;

    return next();
  }
}
