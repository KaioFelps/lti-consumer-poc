import { User, UserUncheckedProps } from "@/identity/user/user.entity";
import { HttpRequest, RequestSession } from "@/lib";

export { SessionUser } from "./extractor";
export { SessionUserMiddleware } from "./middleware";

const RAW_USER_PROPS_KEY = "__raw_user_props__";

function saveSessionUser(req: HttpRequest, user: User) {
  const session = req["session"] as RequestSession;
  session[RAW_USER_PROPS_KEY] = user._getProps();
}

function removeSessionUser(req: HttpRequest) {
  const session = req["session"] as RequestSession;
  if (session[RAW_USER_PROPS_KEY]) delete session[RAW_USER_PROPS_KEY];
  if (session.auth) delete session.auth;
}

function mountSessionUserIfExists(req: HttpRequest) {
  const session = req["session"] as RequestSession;
  const rawUser = session[RAW_USER_PROPS_KEY] as UserUncheckedProps | undefined;

  if (rawUser) session.auth = User.createUnchecked(rawUser);
}

export default {
  saveSessionUser,
  removeSessionUser,
  mountSessionUserIfExists,
};
