import { SetMetadata } from "@nestjs/common";
import { AuthGuard } from "./guard";

const IS_PUBLIC_ROUTE = "isPublicRoute";

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

export default {
  Guard: AuthGuard,
  metadataKey: IS_PUBLIC_ROUTE,
};
