import { Adapter, AdapterPayload } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { OIDCRedisAdapter } from "./adapter";
import { OIDCRedisAdapterFactory } from "./adapter-factory";

export class OIDCRedisAdapterBridge implements Adapter {
  private static internalAdapterFactory: OIDCRedisAdapterFactory;
  private internalAdapter!: OIDCRedisAdapter;

  public static setInternalAdapter(
    internalAdapterFactory: OIDCRedisAdapterFactory,
  ) {
    OIDCRedisAdapterBridge.internalAdapterFactory = internalAdapterFactory;
  }

  public constructor(name: string) {
    if (!OIDCRedisAdapterBridge.internalAdapterFactory) {
      throw new IrrecoverableError(
        "Tried to instantiate a OIDCRedisAdapterBridge without " +
          " setting its internal adapter factory beforehands.",
      );
    }

    this.internalAdapter =
      OIDCRedisAdapterBridge.internalAdapterFactory.getAdapter(name);
  }

  public async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<undefined> {
    await this.internalAdapter.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | undefined> {
    return await this.internalAdapter.find(id);
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined> {
    return await this.internalAdapter.findByUserCode(userCode);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    return await this.internalAdapter.findByUid(uid);
  }

  public async consume(id: string): Promise<undefined> {
    await this.internalAdapter.consume(id);
  }

  public async destroy(id: string): Promise<undefined> {
    await this.internalAdapter.destroy(id);
  }

  public async revokeByGrantId(grantId: string): Promise<undefined> {
    await this.internalAdapter.revokeByGrantId(grantId);
  }
}
