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

  "identity:users-repository:find-user-by-username:resource-not-found": (
    { username }: { username: string | undefined },
    identifier,
  ) => {
    if (!username) {
      console.warn(
        `The message string "${identifier}" expected ` +
          `an \`args.username\` property.`,
      );
    }

    return `Não foi encontrado nenhum usuário com o username "${username}".`;
  },
};

Object.freeze(identityMessageStringsPTBR);
