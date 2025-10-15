import { Global, Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module";
import { ArgonRSModule } from "./argon-rs/argon-rs.module";

@Global()
@Module({
  imports: [DataStoreModule, ArgonRSModule],
  exports: [DataStoreModule, ArgonRSModule],
})
export class ExternalModule {}
