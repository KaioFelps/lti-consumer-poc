import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { HttpRequest } from "@/lib";
import { MessageStringFormatterArg } from "./internal";
import { translate } from "./internal/translate";

@Injectable({ scope: Scope.REQUEST })
export class TranslatorService {
  public constructor(@Inject(REQUEST) private readonly request: HttpRequest) {}

  public getLocale(): string {
    const locale = this.request.cookies.lti_consumer_poc_language ?? "pt-BR";
    return locale;
  }

  public async translate(
    identifier: string,
    args?: MessageStringFormatterArg,
  ): Promise<string> {
    const language = this.getLocale();
    const strings = await this.getStringsFromLanguageTag(language);

    if (!strings) return identifier;

    return translate(identifier, args, strings, language);
  }

  private async getStringsFromLanguageTag(tag: string) {
    switch (tag) {
      case "pt-BR":
        return (await import("./internal/translations/pt-BR")).ptBR;
    }
  }
}
