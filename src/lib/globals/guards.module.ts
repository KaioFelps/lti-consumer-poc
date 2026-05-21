import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@/modules/auth/protected-routes/guard";
import { ProtectedRoutesModule } from "@/modules/auth/protected-routes/protected-routes.module";
import { MvcGuard } from "../mvc-routes/guard";

@Module({
  imports: [ProtectedRoutesModule],
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
