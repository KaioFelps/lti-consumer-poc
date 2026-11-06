import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { Subject } from "rxjs";
import { IncomingScoreEvent } from "../incoming-score.event.js";

@Injectable({ scope: Scope.DEFAULT })
export class SseConnectionsService implements OnModuleDestroy {
  private readonly connections = new LRUCache<string, Subject<MessageEvent>>({
    ttl: 30 * 60 * 1000, // 30 min in ms
    ttlAutopurge: true,
    max: 500,
    onInsert: (_subject, key) => console.info(`Connection "${key}" initiated.`),
    dispose: (subject, key, reason) => {
      console.info(`Connection "${key}" closing (${reason}).`);
      // it'd be interesting to send a message informing that the conneciton is being closed
      // due to inactivity, but I don't find it necessary in this PoC tho
      subject.complete();
    },
  });

  private formatKey(assignmentId: string, userId: string) {
    return `${assignmentId}:${userId}`;
  }

  public register(assignmentId: string, userId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.connections.set(this.formatKey(assignmentId, userId), subject);
    return subject;
  }

  public unregister(
    assignmentId: string,
    userId: string,
    subject: Subject<MessageEvent<IncomingScoreEvent>>,
  ) {
    const key = this.formatKey(assignmentId, userId);

    // delete only if this key still has the same subject
    // peek doesn't touch ttl, different from `get` method
    if (this.connections.peek(key) === subject) {
      // no need to call complete, since it either has been finalized by the controller
      // (using the `finalize` pipe function) or by the LRU cache (that already calls
      // `complete`).
      this.connections.delete(key);
    }
  }

  /**
   * Returns `true` if this app instance held the connection and has sent the grade to the view.
   * Returns `false` otherwise.
   */
  public push(event: IncomingScoreEvent): boolean {
    const subject = this.connections.get(
      this.formatKey(event.assignmentId, event.studentId.toString()),
    );

    if (!subject) return false;

    subject.next({ data: event } as MessageEvent);
    return true;
  }

  // required otherwise the server ain't ever closing since these connections are still opened
  public onModuleDestroy() {
    for (const connection of this.connections.values()) connection.complete();
    this.connections.clear();
  }
}
