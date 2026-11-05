import { Module } from "@nestjs/common";
import { SseConnectionsService } from "./services/sse-connection.service.js";

@Module({
  providers: [SseConnectionsService],
  exports: [SseConnectionsService],
})
export class AgsEventsModule {}
