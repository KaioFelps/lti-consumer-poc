import { NestMiddleware } from "@nestjs/common";
import type { HttpRequest, HttpResponse } from "@/lib.js";
import sessionUser from "../session-user.js";

export class SessionUserMiddleware implements NestMiddleware {
  use(req: HttpRequest, _res: HttpResponse, next: (error?: unknown) => void) {
    sessionUser.mountSessionUserIfExists(req);
    return next();
  }
}
