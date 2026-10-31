import { Injectable, NestMiddleware } from "@nestjs/common";
import { UserPresenter } from "@/external/presenters/entities/user.presenter.js";
import type { HttpRequest, HttpResponse, RequestSession } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { Routes } from "@/routes.js";

// moved from `main.ts` because this would cause Reflect.js typeerror when running
// vitest tests, likely due to circular dependencies or whatever
export const DEFAULT_EJS_LAYOUT = "layouts/main";

@Injectable()
export class MvcSharedDataMiddleware implements NestMiddleware {
  private constructor(private t: TranslatorService) {}

  use(req: HttpRequest, res: HttpResponse, next: (error?: unknown) => void) {
    const sessions = req["session"] as RequestSession;

    res.locals.auth =
      sessions.auth && sessions.auth instanceof User
        ? UserPresenter.present(sessions.auth)
        : undefined;

    res.locals.layout = DEFAULT_EJS_LAYOUT;
    res.locals.routes = Routes;
    res.locals.t = this.t;

    return next();
  }
}
