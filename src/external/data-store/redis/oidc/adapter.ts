/**
 * See: https://github.com/panva/node-oidc-provider/discussions/1310
 */

import { AdapterPayload } from "oidc-provider";
import { RedisClient } from "../client";
import {
  grantable,
  grantKeyFor,
  resolveOIDCKey,
  uidKeyFor,
  userCodeKeyFor,
} from "./helpers";

export class OIDCRedisAdapter {
  public constructor(
    private readonly client: RedisClient,
    private readonly name: string,
  ) {}

  public async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<undefined> {
    const key = resolveOIDCKey(id);
    const multi = this.client.multi();

    multi.call("JSON.SET", key, ".", JSON.stringify(payload));

    if (expiresIn) multi.expire(key, expiresIn);

    if (grantable.has(this.name) && payload.grantId) {
      const grantKey = grantKeyFor(payload.grantId);
      multi.rpush(grantKey, key);
      // if you're seeing grant key lists growing out of acceptable proportions consider using LTRIM
      // here to trim the list to an appropriate length
      const ttl = await this.client.ttl(grantKey);
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
    const data = await this.client.call("JSON.GET", key);
    if (data) return JSON.parse(data as string);
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined> {
    const id = await this.client.get(userCodeKeyFor(userCode));
    if (id) return await this.find(id);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const id = await this.client.get(uidKeyFor(uid));
    if (id) return await this.find(id);
  }

  public async consume(id: string): Promise<undefined> {
    await this.client.call(
      "JSON.SET",
      resolveOIDCKey(id),
      "consumed",
      Math.floor(Date.now() / 1000),
    );
  }

  public async destroy(id: string): Promise<undefined> {
    const key = resolveOIDCKey(id);
    await this.client.del(key);
  }

  public async revokeByGrantId(grantId: string): Promise<undefined> {
    const multi = this.client.multi();

    const tokens = await this.client.lrange(grantKeyFor(grantId), 0, -1);
    tokens.forEach((token) => multi.del(token));

    multi.del(grantKeyFor(grantId));
    await multi.exec();
  }
}
