import { forwardRef, Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module";
import { OIDCModule } from "../oidc.module";
import { OIDCAdapterFactory } from "./factory";

@Module({
  imports: [DataStoreModule, forwardRef(() => OIDCModule)],
  providers: [OIDCAdapterFactory],
  exports: [OIDCAdapterFactory],
})
export class OIDCAdapterModule {}
