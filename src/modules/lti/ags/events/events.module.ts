import { Module } from "@nestjs/common";
import { IncomingScoreEventHandler } from "./incoming-score.event.js";

@Module({
  providers: [IncomingScoreEventHandler],
})
export class AgsEventsModule {}
