import { SessionUserMiddleware } from "@/auth/session-user";
import { SessionsAndFlashMessagesMiddleware } from "./flash-session.middleware";
import { MvcSharedDataMiddleware } from "./mvc-shared-data.middleware";

export default {
  mvc: () =>
    [
      SessionUserMiddleware,
      SessionsAndFlashMessagesMiddleware,
      MvcSharedDataMiddleware,
    ] as const,
};
