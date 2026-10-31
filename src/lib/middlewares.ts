import { SessionUserMiddleware } from "@/modules/auth/session-user.js";
import { SessionsAndFlashMessagesMiddleware } from "./middlewares/flash-session.middleware.js";
import { MvcSharedDataMiddleware } from "./middlewares/mvc-shared-data.middleware.js";

export default {
  mvc: () =>
    [SessionUserMiddleware, SessionsAndFlashMessagesMiddleware, MvcSharedDataMiddleware] as const,
};
