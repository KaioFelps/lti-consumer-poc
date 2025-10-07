import { MessageStringTranslationMap } from ".";

export class MessageStringTranslationContext {
  public constructor(
    public messagesMap: MessageStringTranslationMap,
    public shouldThrowOnUndefinedArgument: boolean = true,
  ) {}
}
