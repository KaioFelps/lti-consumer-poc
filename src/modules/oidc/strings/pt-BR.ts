import { ptBR } from "@/message-string/internal/translations/pt-BR";
import { AvailableScope } from "../consts";

ptBR["oidc:login:title"] = "[OIDC] Logue-se";
ptBR["oidc:accounts:account-not-found"] = ({ id }: { id: string }) =>
  `Não foi encontrada nenhuma conta com id ${id}.`;

ptBR["oidc:confirm:title"] = ({ userName }: { userName: string }) => `[OIDC] Olá, ${userName}`;

ptBR["oidc:error-descriptions:no-client-id-parameter"] =
  "O parâmetro `client_id` é obrigatório, mas não foi fornecido.";
ptBR["oidc:error-descriptions:unregistered-or-unauthorized-client"] =
  "Cliente não autorizado ou registrado.";

ptBR["oidc:scopes:content:p1-no-scope"] = (args: { clientName: string }) =>
  `A aplicação ${args.clientName} deseja acessar a sua conta.`;

ptBR["oidc:scopes:content:p1-many-scopes"] = (args: { clientName: string }) =>
  `A aplicação ${args.clientName} deseja acessar a sua conta e obter as seguintes permissões:`;

ptBR["oidc:confirm:buttons:authorize"] = "Eu autorizo";
ptBR["oidc:confirm:buttons:cancel"] = "Deixa baixo";

ptBR[`oidc:scopes:scopes-descriptions:${AvailableScope.openId}`] = "Acessar recursos em seu nome";
ptBR[`oidc:scopes:scopes-descriptions:${AvailableScope.email}`] = "Acessar seu e-mail";
ptBR[`oidc:scopes:scopes-descriptions:${AvailableScope.profile}`] =
  "Acessar seu nome, data de nascimento, apelido, gênero e outras informações do seu perfil";
ptBR[`oidc:scopes:scopes-descriptions:${AvailableScope.offlineAccess}`] =
  "Acessar seus recursos mesmo quando você estiver offline";

ptBR["oidc:client-error-codes:access_denied"] =
  "O cliente não pode prosseguir sem que o acesso seja concedido.";
ptBR["oidc:client-error-codes:invalid_token"] = "O seu acesso expirou. Faça login novamente.";
