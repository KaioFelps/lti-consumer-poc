import { Inject, Injectable } from "@nestjs/common";
import { RedisClient } from "../client";
import { OIDCRedisAdapter } from "./adapter";

@Injectable()
export class OIDCRedisAdapterFactory {
  @Inject()
  private readonly redis: RedisClient;

  public getAdapter(name: string) {
    return new OIDCRedisAdapter(this.redis, name);
  }
}
