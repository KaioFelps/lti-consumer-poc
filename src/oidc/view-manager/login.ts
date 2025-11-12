import { Interaction } from "oidc-provider";
import { TranslatorService } from "@/message-string/translator.service";
import { ViewManager } from ".";

type LoginViewData = {
  interaction: Interaction;
  localeHint?: string;
  translatorService: TranslatorService;
};

export class LoginViewManager extends ViewManager {
  public constructor(private data: LoginViewData) {
    super();
  }

  public getView(): string {
    return "login";
  }
  public async getRenderData(): Promise<object | undefined> {
    const { interaction, translatorService: t, localeHint } = this.data;

    return {
      endpoint: `/oidc/interaction/${interaction.uid}/login`,
      registerEndpoint: "/auth/register",
      title: await t.translateWithHint("oidc:login:title", localeHint),
      locale: localeHint ?? t.getLocale(),
      labels: {
        username: await t.translateWithHint(
          "auth:forms:login:labels:username",
          localeHint,
        ),
        password: await t.translateWithHint(
          "auth:forms:login:labels:password",
          localeHint,
        ),
      },
      buttons: {
        login: await t.translateWithHint(
          "auth:forms:login:buttons:login",
          localeHint,
        ),
        noAccount: await t.translateWithHint(
          "auth:forms:login:buttons:no-account",
          localeHint,
        ),
      },
    };
  }
}
