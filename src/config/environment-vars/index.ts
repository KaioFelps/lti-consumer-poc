import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariablesSchema } from "./schema";

@Injectable()
export class EnvironmentVars {
  private constructor(
    public readonly nodeEnv: EnvironmentVariablesSchema["NODE_ENV"],
    public readonly database: {
      readonly user: string;
      readonly password: string;
      readonly port: number;
      readonly host: string;
      readonly name: string;
    },
    public readonly app: {
      readonly url: string;
      readonly secret: string;
      readonly name: string;
      readonly productCode: string;
      readonly privateKeyB64: string;
    },
    public readonly redis: {
      readonly user: string;
      readonly password: string;
      readonly port: number;
      readonly host: string;
    },
  ) {}

  public static async create(
    nestConfigService: ConfigService<EnvironmentVariablesSchema, true>,
  ): Promise<EnvironmentVars> {
    return new EnvironmentVars(
      nestConfigService.get("NODE_ENV"),
      {
        //   connectionUrl: nestConfigService.get("DB_CONNECTION_URL"),
        host: nestConfigService.get("DB_HOST"),
        password: nestConfigService.get("DB_PASSWORD"),
        port: nestConfigService.get("DB_PORT"),
        user: nestConfigService.get("DB_USER"),
        name: nestConfigService.get("DB_NAME"),
      },
      {
        url: nestConfigService.get("APP_URL"),
        secret: nestConfigService.get("APP_SECRET"),
        name: nestConfigService.get("APP_NAME"),
        productCode: nestConfigService.get("APP_PRODUCT_NAME"),
        privateKeyB64: nestConfigService.get("PRIVATE_KEY_BASE64"),
      },
      {
        user: nestConfigService.get("REDIS_USER"),
        password: nestConfigService.get("REDIS_PASSWORD"),
        host: nestConfigService.get("REDIS_HOST"),
        port: nestConfigService.get("REDIS_PORT"),
      },
    );
  }
}
