import { Adapter, AdapterPayload } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ModelName, OIDCAdapterFactory } from "./factory";

export class OIDCAdapterBridge implements Adapter {
  private static internalAdapterFactory: OIDCAdapterFactory;
  private internalAdapter!: Adapter;

  public static setInternalAdapter(internalAdapterFactory: OIDCAdapterFactory) {
    OIDCAdapterBridge.internalAdapterFactory = internalAdapterFactory;
  }

  public constructor(modelName: ModelName) {
    if (!OIDCAdapterBridge.internalAdapterFactory) {
      throw new IrrecoverableError(
        "Tried to instantiate a OIDCRedisAdapterBridge without " +
          " setting its internal adapter factory beforehands.",
      );
    }

    this.internalAdapter = OIDCAdapterBridge.internalAdapterFactory.getAdapter(modelName);
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined> {
    await this.internalAdapter.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | undefined> {
    return (await this.internalAdapter.find(id)) ?? undefined;
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    return (await this.internalAdapter.findByUserCode(userCode)) ?? undefined;
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    return (await this.internalAdapter.findByUid(uid)) ?? undefined;
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
