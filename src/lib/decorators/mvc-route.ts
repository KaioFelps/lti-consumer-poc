import { SetMetadata } from "@nestjs/common";

export const IS_MVC_ROUTE = "isMVCRoute";

export const MVC = () => SetMetadata(IS_MVC_ROUTE, true);
