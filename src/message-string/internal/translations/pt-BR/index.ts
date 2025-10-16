import { authMessageStringsPTBR } from "@/auth/strings/pt-BR";
import { identityMessageStringsPTBR } from "@/identity/strings/pt-BR";
import { MessageStringTranslationMap } from "@/message-string/internal";

export const ptBR: MessageStringTranslationMap = {
  "core:errors:internal-error-message":
    "Houve um problema com o servidor, tente novamente mais tarde.",
  ...identityMessageStringsPTBR,
  ...authMessageStringsPTBR,
};

Object.freeze(ptBR);
