/**
 * See: https://github.com/panva/node-oidc-provider/discussions/1310
 */

import { AdapterPayload } from "oidc-provider";
import {
  grantable,
  grantKeyFor,
  resolveOIDCKey,
  uidKeyFor,
  userCodeKeyFor,
} from "@/modules/oidc/adapter/helpers";
import { Redis } from "./client";

export class OIDCRedisAdapter {
  public constructor(
    private readonly redis: Redis,
    private readonly name: string,
  ) {}

  public async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<undefined> {
    const key = resolveOIDCKey(id);
    const multi = this.redis.client.multi();

    multi.json.set(key, ".", JSON.stringify(payload));

    if (expiresIn) multi.expire(key, expiresIn);

    if (grantable.has(this.name) && payload.grantId) {
      const grantKey = grantKeyFor(payload.grantId);
      multi.rPush(grantKey, key);
      // if you're seeing grant key lists growing out of acceptable proportions consider using LTRIM
      // here to trim the list to an appropriate length
      const ttl = await this.redis.client.ttl(grantKey);
      if (expiresIn > ttl) {
        multi.expire(grantKey, expiresIn);
      }
    }

    if (payload.userCode) {
      const userCodeKey = userCodeKeyFor(payload.userCode);
      multi.set(userCodeKey, id);
      multi.expire(userCodeKey, expiresIn);
    }

    if (payload.uid) {
      const uidKey = uidKeyFor(payload.uid);
      multi.set(uidKey, id);
      multi.expire(uidKey, expiresIn);
    }

    await multi.exec();
  }

  public async find(id: string): Promise<AdapterPayload | undefined> {
    const key = resolveOIDCKey(id);
    const data = await this.redis.client.json.get(key);
    if (data) return JSON.parse(data as string);
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined> {
    const id = await this.redis.client.get(userCodeKeyFor(userCode));
    if (id) return await this.find(id);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const id = await this.redis.client.get(uidKeyFor(uid));
    if (id) return await this.find(id);
  }

  public async consume(id: string): Promise<undefined> {
    await this.redis.client.json.set(
      resolveOIDCKey(id),
      "consumed",
      Math.floor(Date.now() / 1000),
    );
  }

  public async destroy(id: string): Promise<undefined> {
    const key = resolveOIDCKey(id);
    await this.redis.client.del(key);
  }

  public async revokeByGrantId(grantId: string): Promise<undefined> {
    const multi = this.redis.client.multi();

    const tokens = await this.redis.client.lRange(grantKeyFor(grantId), 0, -1);
    tokens.forEach((token) => multi.del(token));

    multi.del(grantKeyFor(grantId));
    await multi.exec();
  }
}
