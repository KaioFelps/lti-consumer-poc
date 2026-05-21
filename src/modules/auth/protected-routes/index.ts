import { SetMetadata } from "@nestjs/common";
import { type HttpRequest } from "@/lib";

const IS_PUBLIC_ROUTE_METADATA_KEY = "isPublicRoute";
const AUTH_GUARD_STRATEGY_METADATA_KEY = "authGuardStrategy";

const AUTH_GUARD_HANDLER_KEY = "__auth_guard_strategy__";

export enum AuthStrategy {
  Session = "session",
  LtiToolsJwt = "lti_tools_jwt",
}

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE_METADATA_KEY, true);

export type AuthGuardConfig = {
  /**
   * @default AuthStrategy.Session
   */
  strategy?: AuthStrategy;
};

export const ConfigAuthGuard = (config: AuthGuardConfig) => {
  return SetMetadata(AUTH_GUARD_STRATEGY_METADATA_KEY, config);
};

function attachAuthGuardConfigsToRequest(request: HttpRequest, config: AuthGuardConfig = {}) {
  request[AUTH_GUARD_HANDLER_KEY] = config;
}

function getAuthGuardConfigsFromRequest(request: HttpRequest): AuthGuardConfig {
  return request[AUTH_GUARD_HANDLER_KEY];
}

export default {
  publicRouteMetadataKey: IS_PUBLIC_ROUTE_METADATA_KEY,
  authStrategyMetadataKey: AUTH_GUARD_STRATEGY_METADATA_KEY,
  authStrategyHandlerKey: AUTH_GUARD_HANDLER_KEY,
  attachAuthGuardConfigsToRequest,
  getAuthGuardConfigsFromRequest,
};
