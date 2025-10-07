import { Injectable } from "@nestjs/common";
import { MessageStringFormatterArg } from "./internal";
import { translate } from "./internal/translate";
import { ptBR } from "./internal/translations/pt-BR";

@Injectable()
export class TranslatorService {
  public translate(
    identifier: string,
    args?: MessageStringFormatterArg,
  ): string {
    return translate(identifier, args, ptBR, "pt-BR");
  }
}
