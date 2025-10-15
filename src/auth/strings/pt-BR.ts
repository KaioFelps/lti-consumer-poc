import { PersonGender } from "@/identity/person/enums/gender";
import { SystemRole } from "@/identity/user/enums/system-role";
import { MessageStringTranslationMap } from "@/message-string/internal";

export const authMessageStringsPTBR: MessageStringTranslationMap = {
  "auth:register-user:username-invalid-type":
    "O nome de usuário é obrigatório e deve ser formado por um conjunto de caracteres.",

  "auth:register-user:password-invalid-type":
    "Sua senha é obrigatória, e deve ser um conjunto de caracteres.",

  "auth:register-user:password-too-short":
    "A senha deve ter, no mínimo, 8 caracteres.",

  "auth:user-register:system-role-invalid-type":
    "O cargo do usuário deve assumir um dos valores " +
    `${SystemRole.Admin} ou ${SystemRole.User}.`,

  "auth:register-person:date-invalid-type":
    "A data precisa estar num formato válido.",

  "auth:register-person:email-invalid-type":
    "O e-mail fornecido precisa ser um endereço de e-mail válido.",

  "auth:register-person:gender-invalid-type":
    "Se informado, o gênero deve ser ser representado por um dos valores válidos: " +
    `${PersonGender.Female}, ${PersonGender.Male} ou ${PersonGender.NonBinary}`,

  "auth:register-person:cpf-invalid-type": "Informar seu CPF é obrigatório.",
  "auth:register-person:cpf-invalid-cpf": "O CPF fornecido é inválido",

  "auth:register-person:first-name-invalid-type":
    "O primeiro nome é um campo obrigatório.",

  "auth:register-person:surname-invalid-type":
    "O sobrenome é um campo obrigatório.",

  "auth:authenticate-user:username-invalid-type":
    "O campo 'username' é obrigatório e precisa ser um texto válido.",

  "auth:authenticate-user:password-invalid-type":
    "A senha precisa ser um texto e é obrigatória.",
};

Object.freeze(authMessageStringsPTBR);
