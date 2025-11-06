import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "../client";
import { OIDCRedisAdapter } from "./adapter";

@Injectable()
export class OIDCRedisAdapterFactory {
  @Inject()
  private readonly redis: Redis;

  public getAdapter(name: string) {
    return new OIDCRedisAdapter(this.redis, name);
  }
}
