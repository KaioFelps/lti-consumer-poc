import { Socket } from "node:net";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import type { UUID } from "common/src/types/uuid.js";
import { LTI_ACTIVITIES_GRADES_SYNC_QUEUE } from "@/modules/lti.js";
import { LtiScore } from "$/assignment-and-grade/entities/index.js";

export class IncomingScoreEvent {
  public constructor(
    public readonly lineItemId: UUID,
    public readonly studentId: UUID,
    public readonly activityProgress: LtiScore.ActivityProgress,
    public readonly gradingProgress: LtiScore.GradingProgress,
    public readonly score: { given: number; maximum: number } | undefined,
  ) {}
}

type MapKey = `${string}:${string}`;
const STUDENTS_CONNECTIONS_MAP: Map<MapKey, Socket> = new Map();

@Processor(LTI_ACTIVITIES_GRADES_SYNC_QUEUE)
export class IncomingScoreEventHandler extends WorkerHost {
  @OnWorkerEvent("active")
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name} with data ${job.data}.`);
  }

  public async process(job: Job<IncomingScoreEvent>, token: string) {
    const key = `${job.data.lineItemId.toString()}:${job.data.studentId.toString()}` as MapKey;
    const socket = STUDENTS_CONNECTIONS_MAP.get(key);

    console.log("tentou buscar", key);

    if (!socket) return;

    const { score, activityProgress, gradingProgress } = job.data;
    socket.write(JSON.stringify({ score, activityProgress, gradingProgress }));

    await job.moveToCompleted(undefined, token);
  }
}
