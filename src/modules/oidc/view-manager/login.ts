import { TranslatorService } from "@/message-string/translator.service";
import { ViewManager } from ".";

type LoginViewData = {
  loginEndpoint: string;
  localeHint?: string;
  translatorService: TranslatorService;
  destinyEndpoint?: string;
};

export class LoginViewManager extends ViewManager {
  public constructor(private data: LoginViewData) {
    super();
  }

  public getView(): string {
    return "login";
  }

  public async getOidcRenderData(): Promise<object | undefined> {
    const { translatorService: t, localeHint, loginEndpoint, destinyEndpoint } = this.data;

    return {
      loginEndpoint,
      destinyEndpoint,
      title: await t.translateWithHint("oidc:login:title", localeHint),
      locale: localeHint ?? t.getLocale(),
      labels: {
        username: await t.translateWithHint("auth:forms:login:labels:username", localeHint),
        password: await t.translateWithHint("auth:forms:login:labels:password", localeHint),
      },
      buttons: {
        login: await t.translateWithHint("auth:forms:login:buttons:login", localeHint),
        noAccount: await t.translateWithHint("auth:forms:login:buttons:no-account", localeHint),
      },
    };
  }

  public async getRenderData(): Promise<object | undefined> {
    const { translatorService: t, localeHint, loginEndpoint, destinyEndpoint } = this.data;

    return {
      loginEndpoint,
      destinyEndpoint,
      title: await t.translateWithHint("auth:forms:login:title", localeHint),
      labels: {
        username: await t.translateWithHint("auth:forms:login:labels:username", localeHint),
        password: await t.translateWithHint("auth:forms:login:labels:password", localeHint),
      },
      buttons: {
        login: await t.translateWithHint("auth:forms:login:buttons:login", localeHint),
        noAccount: await t.translateWithHint("auth:forms:login:buttons:no-account", localeHint),
      },
    };
  }
}
