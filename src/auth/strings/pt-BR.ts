import { MessageStringTranslationMap } from "@/message-string/internal";

export const authMessageStringsPTBR: MessageStringTranslationMap = {
  "auth:register-user:username-invalid-type":
    "O nome de usuário é obrigatório e deve ser formado por um conjunto de caracteres.",

  "auth:register-user:password-invalid-type":
    "Sua senha é obrigatória, e deve ser um conjunto de caracteres.",

  "auth:register-user:password-too-short":
    "A senha deve ter, no mínimo, 8 caracteres.",
};

Object.freeze(authMessageStringsPTBR);
