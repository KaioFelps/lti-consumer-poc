import { Global, Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module.js";
import { ArgonRSModule } from "./argon-rs/argon-rs.module.js";

@Global()
@Module({
  imports: [DataStoreModule, ArgonRSModule],
  exports: [DataStoreModule, ArgonRSModule],
})
export class ExternalModule {}
