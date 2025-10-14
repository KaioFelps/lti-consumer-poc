import { Module } from "@nestjs/common";
import { DataStoreModule } from "@/external/data-store/datastore.module";

@Module({
  imports: [DataStoreModule],
})
export class ExternalModule {}
