import { Module } from "@nestjs/common";
import { RedisModule } from "../redis.module";
import { OIDCRedisAdapter } from "./adapter";
import { OIDCRedisAdapterFactory } from "./adapter-factory";

@Module({
  imports: [RedisModule],
  providers: [OIDCRedisAdapterFactory, OIDCRedisAdapter],
  exports: [OIDCRedisAdapterFactory, OIDCRedisAdapter],
})
export class RedisODICModule {}
