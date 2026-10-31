import { Client, Interaction } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { OIDCAccount } from "@/modules/oidc/account.js";
import { ConsentPromptReason } from "@/modules/oidc/helpers.js";
import { ViewManager } from "../view-manager.js";
import { ScopesAreMissingConsentViewManager } from "./consent/scopes-missing.js";

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
