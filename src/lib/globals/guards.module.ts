import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@/modules/auth/public-routes/guard";
import { MvcGuard } from "../mvc-routes/guard";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: MvcGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class GlobalGuardsModule {}
