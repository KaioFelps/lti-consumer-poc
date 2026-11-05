import { Module } from "@nestjs/common";
import { SseConnectionsService } from "./services/sse-connections.service.js";
import { SyncLtiAssignmentGradeService } from "./services/sync-lti-assignment-grade.service.js";

@Module({
  providers: [SseConnectionsService, SyncLtiAssignmentGradeService],
  exports: [SseConnectionsService, SyncLtiAssignmentGradeService],
})
export class AgsEventsModule {}
