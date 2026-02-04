import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import publicRoutes from "@/modules/auth/public-routes";
import mvcRoutes from "../mvc-routes";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: mvcRoutes.Guard,
    },
    {
      provide: APP_GUARD,
      useClass: publicRoutes.Guard,
    },
  ],
})
export class GlobalGuardsModule {}
