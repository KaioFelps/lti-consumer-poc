import { Inject, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { EnvironmentVars } from "@/config/environment-vars";

export class RedisClient
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  public constructor(@Inject() env: EnvironmentVars) {
    const { user: _, ...redisConfig } = env.redis;

    super({
      ...redisConfig,
      lazyConnect: true,
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
