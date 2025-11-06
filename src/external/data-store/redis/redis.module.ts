import { Module } from "@nestjs/common";
import { Redis } from "./client";

@Module({
  providers: [Redis],
  exports: [Redis],
})
export class RedisModule {}
