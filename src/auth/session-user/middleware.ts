import { NestMiddleware } from "@nestjs/common";
import { HttpRequest, HttpResponse } from "@/lib";
import sessionUser from ".";

export class SessionUserMiddleware implements NestMiddleware {
  use(req: HttpRequest, _res: HttpResponse, next: (error?: unknown) => void) {
    sessionUser.mountSessionUserIfExists(req);
    return next();
  }
}
