import { PersonGender } from "@/identity/person/enums/gender";
import { SystemRole } from "@/identity/user/enums/system-role";
import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["auth:unauthorized-access:message"] =
  "Você não está autorizado a acessar esse recurso.";

ptBR["auth:unauthorized-access:title"] = "Não autorizado";

ptBR["auth:register-user:username-invalid-type"] =
  "O nome de usuário é obrigatório.";

ptBR["auth:register-user:password-invalid-type"] =
  "Sua senha é obrigatória; e deve ser um conjunto de caracteres.";

ptBR["auth:register-user:password-too-short"] =
  "A senha deve ter; no mínimo, 8 caracteres.";

ptBR["auth:register-user:password-too-long"] =
  "A senha não deve exceder 70 caracteres.";

ptBR["auth:user-register:system-role-invalid-type"] =
  "O cargo do usuário deve assumir um dos valores " +
  `${SystemRole.Admin} ou ${SystemRole.User}.`;

ptBR["auth:register-person:date-invalid-type"] =
  "A data precisa estar num formato válido.";

ptBR["auth:register-person:email-invalid-type"] =
  "O e-mail fornecido precisa ser um endereço de e-mail válido.";

ptBR["auth:register-person:gender-invalid-type"] =
  "Se informado; o gênero deve ser ser representado por um dos valores válidos: " +
  `${PersonGender.Female}; ${PersonGender.Male} ou ${PersonGender.NonBinary}`;

ptBR["auth:register-person:cpf-invalid-type"] =
  "Informar seu CPF é obrigatório.";
ptBR["auth:register-person:cpf-invalid-cpf"] = "O CPF fornecido é inválido";

ptBR["auth:register-person:first-name-invalid-type"] =
  "O primeiro nome é um campo obrigatório.";

ptBR["auth:register-person:surname-invalid-type"] =
  "O sobrenome é um campo obrigatório.";

ptBR["auth:authenticate-user:username-invalid-type"] =
  "O campo 'username' é obrigatório e precisa ser um texto válido.";

ptBR["auth:authenticate-user:password-invalid-type"] =
  "A senha precisa ser um texto e é obrigatória.";

ptBR["auth:authenticate-user:invalid-credentials"] = "Credenciais inválidas.";

ptBR["auth:forms:register:title"] = "Registre-se";
ptBR["auth:forms:register:labels:cpf"] = "CPF";
ptBR["auth:forms:register:labels:username"] = "Nome de usuário";
ptBR["auth:forms:register:labels:password"] = "Senha";
ptBR["auth:forms:register:labels:birth-date"] = "Data de nascimento";
ptBR["auth:forms:register:labels:first-name"] = "Primeiro nome";
ptBR["auth:forms:register:labels:surname"] = "Sobrenome";
ptBR["auth:forms:register:labels:email"] = "E-mail";
ptBR["auth:forms:register:labels:gender"] = "Gênero";
ptBR["auth:forms:register:buttons:create"] = "Criar";
ptBR["auth:forms:register:buttons:already-has-account"] = "Já tenho uma conta";
ptBR["auth:forms:register:buttons:go-login"] = "Faça login";
ptBR["auth:forms:register:success-message"] = ({ id }: { id: string }) =>
  `Conta criada com sucesso. Seu ID é: ${id}.`;

ptBR["auth:forms:login:title"] = "Fazer login";
ptBR["auth:forms:login:labels:username"] = "Username";
ptBR["auth:forms:login:labels:password"] = "Senha";
ptBR["auth:forms:login:buttons:login"] = "Logar";
ptBR["auth:forms:login:buttons:no-account"] = "Ainda não tenho uma conta";
