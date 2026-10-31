import { forwardRef, Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module.js";
import { OIDCModule } from "../oidc.module.js";
import { OIDCAdapterFactory } from "./factory.js";

@Module({
  imports: [DataStoreModule, forwardRef(() => OIDCModule)],
  providers: [OIDCAdapterFactory],
  exports: [OIDCAdapterFactory],
})
export class OIDCAdapterModule {}
