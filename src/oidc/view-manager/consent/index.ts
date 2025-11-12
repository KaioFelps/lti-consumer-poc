import { Client, Interaction } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { TranslatorService } from "@/message-string/translator.service";
import { OIDCAccount } from "@/oidc/account";
import { ConsentPromptReason } from "@/oidc/helpers";
import { ViewManager } from "..";
import { ScopesAreMissingConsentViewManager } from "./scopes-missing";

export type ConsentViewManagerData = {
  translatorService: TranslatorService;
  localeHint?: string;
  client: Client;
  account: OIDCAccount;
  interaction: Interaction;
};

export class ConsentViewManagerFactory {
  public static create(
    args: { reason: ConsentPromptReason } & ConsentViewManagerData,
  ): ViewManager {
    switch (args.reason) {
      case "op_scopes_missing":
        return new ScopesAreMissingConsentViewManager(args);
      default:
        throw new IrrecoverableError(
          `ConsentViewData implementation for ${args.reason} is missing.`,
        );
    }
  }
}
