import { Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module";
import { OIDCAdapterFactory } from "./factory";

@Module({
  imports: [DataStoreModule],
  providers: [OIDCAdapterFactory],
  exports: [OIDCAdapterFactory],
})
export class OIDCAdapterModule {}
