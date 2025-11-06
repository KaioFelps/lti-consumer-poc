import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariablesSchema } from "./schema";

@Injectable()
export class EnvironmentVars {
  private constructor(
    public readonly database: {
      readonly user: string;
      readonly password: string;
      readonly port: number;
      readonly host: string;
      readonly name: string;
    },
    public readonly appUrl: string,
    public readonly appSecret: string,
    public readonly redis: {
      user: string;
      password: string;
      port: number;
      host: string;
    },
  ) {}

  public static async create(
    nestConfigService: ConfigService<EnvironmentVariablesSchema, true>,
  ): Promise<EnvironmentVars> {
    return new EnvironmentVars(
      {
        //   connectionUrl: nestConfigService.get("DB_CONNECTION_URL"),
        host: nestConfigService.get("DB_HOST"),
        password: nestConfigService.get("DB_PASSWORD"),
        port: nestConfigService.get("DB_PORT"),
        user: nestConfigService.get("DB_USER"),
        name: nestConfigService.get("DB_NAME"),
      },
      nestConfigService.get("APP_URL"),
      nestConfigService.get("APP_SECRET"),
      {
        user: nestConfigService.get("REDIS_USER"),
        password: nestConfigService.get("REDIS_PASSWORD"),
        host: nestConfigService.get("REDIS_HOST"),
        port: nestConfigService.get("REDIS_PORT"),
      },
    );
  }
}
