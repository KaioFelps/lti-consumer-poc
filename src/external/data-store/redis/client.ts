import { Inject, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import { EnvironmentVars } from "@/config/environment-vars";

export class Redis implements OnModuleInit, OnModuleDestroy {
  public readonly client: RedisClientType;

  public constructor(@Inject() env: EnvironmentVars) {
    const url = `redis://${env.redis.user}:${env.redis.password}@${env.redis.host}:${env.redis.port}`;
    const client = createClient({ url });

    this.client = client as RedisClientType;
  }

  async onModuleInit() {
    await this.client.connect();
  }

  onModuleDestroy() {
    this.client.destroy();
  }
}
