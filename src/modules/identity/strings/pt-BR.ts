import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["identity:person:cpf:non-numeric-chars"] = (args, identifier) => {
  if (!args.argumentName)
    console.warn(
      `The message string '${identifier}' expected ` +
        `an \`args.argumentName\` property.`,
    );

  return `${args.argumentName ?? "O CPF"} deveria conter somente números.`;
};

ptBR["identity:person:cpf:invalid-cpf"] = "O CPF fornecido é inválido.";

ptBR["identity:users-repository:find-user-by-username:resource-not-found"] = (
  { username },
  identifier,
) => {
  if (typeof username === "undefined") {
    console.warn(
      `The message string '${identifier}' expected an \`args.username\` property.`,
    );

    return identifier;
  }

  return `Não foi encontrado nenhum usuário com o username '${username}'.`;
};

ptBR["identity:people-repository:find-by-id:resource-not-found"] = (
  { personId },
  identifier,
) => {
  if (!personId) {
    console.warn(
      `The message string ${identifier} expected an 'args.personId' property.`,
    );

    return "Não foi possível encontrar nenhuma pessoa com o ID fornecido.";
  }

  return `Não foi possível encontrar nenhuma pessoa com ID ${personId}`;
};
