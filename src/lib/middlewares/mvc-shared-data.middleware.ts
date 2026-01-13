import { NestMiddleware } from "@nestjs/common";
import { UserPresenter } from "@/external/presenters/entities/user.presenter";
import { User } from "@/identity/user/user.entity";
import { DEFAULT_EJS_LAYOUT } from "@/main";
import { HttpRequest, HttpResponse, RequestSession } from "..";

export class MvcSharedDataMiddleware implements NestMiddleware {
  use(req: HttpRequest, res: HttpResponse, next: (error?: unknown) => void) {
    const sessions = req["session"] as RequestSession;

    res.locals.auth =
      sessions.auth && sessions.auth instanceof User
        ? UserPresenter.present(sessions.auth)
        : undefined;

    res.locals.layout = DEFAULT_EJS_LAYOUT;

    return next();
  }
}
