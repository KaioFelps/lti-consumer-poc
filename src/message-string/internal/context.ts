import { MessageStringTranslationMap } from "./index.js";

export class MessageStringTranslationContext {
  public constructor(
    public messagesMap: MessageStringTranslationMap,
    public shouldThrowOnUndefinedArgument: boolean = true,
  ) {}
}
