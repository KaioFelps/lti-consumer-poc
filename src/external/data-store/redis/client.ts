import { Inject, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";
import { EnvironmentVars } from "@/config/environment-vars.js";

export class Redis implements OnModuleInit, OnApplicationShutdown {
  public readonly client: RedisClientType;

  public constructor(@Inject(EnvironmentVars) env: EnvironmentVars) {
    const url = `redis://${env.redis.user}:${env.redis.password}@${env.redis.host}:${env.redis.port}`;
    const client = createClient({ url });

    this.client = client as RedisClientType;
  }

  async onModuleInit() {
    await this.client.connect();
  }

  // after module destroy and after 'before application shutdown'; close only when no
  // requests are being accepted anymore and no more modules relies on this
  async onApplicationShutdown() {
    if (this.client.isOpen) await this.client.close();
  }
}
