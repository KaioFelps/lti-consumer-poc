import { NestMiddleware } from "@nestjs/common";
import { User } from "@/identity/user/user.entity";
import { HttpRequest, HttpResponse, RequestSession } from "..";

export class AuthUserSessionMiddleware implements NestMiddleware {
  use(req: HttpRequest, _: HttpResponse, next: (error?: unknown) => void) {
    const session = req["session"] as RequestSession;

    if (!session.auth) return next();

    if (!(session.auth instanceof User)) {
      session.auth = User.createUnchecked(session.auth);
    }

    return next();
  }
}
