import { Module } from "@nestjs/common";
import { RedisClient } from "./client";

@Module({
  providers: [RedisClient],
  exports: [RedisClient],
})
export class RedisModule {}
