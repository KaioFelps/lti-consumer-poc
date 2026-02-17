import { AvailableScope } from "@/modules/oidc/consts";
import { Routes } from "@/routes";
import { ViewManager } from "..";
import { ConsentViewManagerData } from ".";

export class ScopesAreMissingConsentViewManager extends ViewManager {
  public constructor(private data: ConsentViewManagerData) {
    super();
  }

  public async getRenderData(): Promise<object> {
    const { translatorService: t, localeHint, account, client, interaction } = this.data;

    const missingScopes = (interaction.prompt.details.missingOIDCScope as string[]).filter(
      (scope) => scope !== AvailableScope.openId,
    );

    const missingScopesDescriptions = await Promise.all(
      missingScopes.map((scope) => t.translate(`oidc:scopes:scopes-descriptions:${scope}`)),
    );

    const paragraph1 =
      missingScopesDescriptions.length === 0
        ? "oidc:scopes:content:p1-no-scope"
        : "oidc:scopes:content:p1-many-scopes";

    return {
      title: await t.translateWithHint("oidc:confirm:title", localeHint, {
        userName: account.person.getName(),
      }),
      endpoints: {
        abort: Routes.oidc.abort(interaction.uid),
        consent: Routes.oidc.consent(interaction.uid),
      },
      clientName: client.clientName,
      content: {
        p1: await t.translateWithHint(paragraph1, localeHint, {
          clientName: client.clientName,
        }),
        missingScopes: missingScopesDescriptions,
      },
      buttons: {
        authorize: await t.translateWithHint("oidc:confirm:buttons:authorize", localeHint),
        cancel: await t.translateWithHint("oidc:confirm:buttons:cancel", localeHint),
      },
    };
  }

  public getView(): string {
    return "confirm";
  }
}
