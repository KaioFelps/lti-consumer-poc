import { Inject, Injectable } from "@nestjs/common";
import { FAN_OUT_PUB, FAN_OUT_SUB } from "@/external/data-store/datastore.module.js";
import { Redis } from "@/external/data-store/redis/client.js";
import { LTI_ACTIVITIES_GRADES_SYNC_CHANNEL } from "@/modules/lti.js";
import { IncomingScoreEvent } from "../incoming-score.event.js";
import { SseConnectionsService } from "./sse-connections.service.js";

@Injectable()
export class SyncLtiAssignmentGradeService {
  constructor(
    @Inject(FAN_OUT_PUB) private readonly pub: Redis,
    @Inject(FAN_OUT_SUB) private readonly sub: Redis,
    private readonly connections: SseConnectionsService,
  ) {}

  async onModuleInit() {
    await this.sub.client.subscribe(LTI_ACTIVITIES_GRADES_SYNC_CHANNEL, (message, channel) => {
      if (channel !== LTI_ACTIVITIES_GRADES_SYNC_CHANNEL) return;

      try {
        const event: IncomingScoreEvent = JSON.parse(message);
        this.connections.push(event);
      } catch (err) {
        console.error(
          `${SyncLtiAssignmentGradeService.name} received an invalid event message ("${message}").`,
          err,
        );
      }
    });
  }

  async sync(event: IncomingScoreEvent) {
    await this.pub.client.publish(LTI_ACTIVITIES_GRADES_SYNC_CHANNEL, JSON.stringify(event));
  }

  async onModuleDestroy() {
    await this.sub.client.quit();
    await this.pub.client.quit();
  }
}
