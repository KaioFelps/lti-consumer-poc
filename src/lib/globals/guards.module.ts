import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import mvcRoutes from "../mvc-routes";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: mvcRoutes.Guard,
    },
  ],
})
export class GlobalGuardsModule {}
