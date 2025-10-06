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
  ) {}

  public static async create(
    nestConfigService: ConfigService<EnvironmentVariablesSchema, true>,
  ): Promise<EnvironmentVars> {
    return new EnvironmentVars({
      //   connectionUrl: nestConfigService.get("DB_CONNECTION_URL"),
      host: nestConfigService.get("DB_HOST"),
      password: nestConfigService.get("DB_PASSWORD"),
      port: nestConfigService.get("DB_PORT"),
      user: nestConfigService.get("DB_USER"),
      name: nestConfigService.get("DB_NAME"),
    });
  }
}
