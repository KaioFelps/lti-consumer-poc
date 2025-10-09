import { MessageStringTranslationMap } from "@/message-string/internal";

export const identityMessageStringsPTBR: MessageStringTranslationMap = {
  "identity:person:cpf:non-numeric-chars": (args, identifier) => {
    if (!args.argumentName)
      console.warn(
        `The message string "${identifier}" expected ` +
          `an \`args.argumentName\` property.`,
      );

    return `${args.argumentName ?? "O CPF"} deveria conter somente números.`;
  },

  "identity:person:cpf:invalid-cpf": "O CPF fornecido é inválido.",
};

Object.freeze(identityMessageStringsPTBR);
