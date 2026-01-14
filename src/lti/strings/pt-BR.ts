import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["lti:tool-not-found-by-id"] = ({ toolId }: { toolId: string }) => {
  return `Não foi possível encontrar nenhuma ferramenta com ID ${toolId}`;
};

ptBR["lti:register-tool:title"] = "Registrar Ferramenta LTI";
ptBR["lti:register-tool:labels:register-platform"] =
  "URL do endpoint de registro da ferramenta";
ptBR["lti:register-tool:labels:use-docker-internal-host"] =
  "Utilizar host interna do Docker";
ptBR["lti:register-tool:descriptions:use-docker-internal-host"] =
  "Substitui o domínio do <i>issuer</i> pelo endereço interno do Docker que será " +
  "mapeado para o verdadeiro localhost. Necessário caso o registro seja de uma " +
  "ferramenta que esteja rodando em um container Docker.";
ptBR["lti:register-tool:buttons:register-tool"] = "Registrar ferramenta LTI";
ptBR["lti:register-tool:registration-endpoint-invalid-type"] =
  "O endpoint de registro da plataforma precisa ser um URL válido.";
ptBR["lti:register-tool:use-docker-internal-host-invalid-type"] =
  "Você deve assinalar se o <i>host</i> interno do Docker deve ser utilizado ou não por meio de uma <i>checkbox</i>.";
ptBR["lti:register-tool:registration-success-message"] =
  "Ferramenta registrada com successo!";
ptBR["lti:register-tool:ready-to-go-paragraph"] =
  "Você está quase lá. Basta conectar-se com a ferramenta para finalizar o registro!";
ptBR["lti:register-tool:buttons:finish-registration"] = "Finalizar registro";
ptBR["lti:register-tool:popup-title"] = "Registrar ferramenta LTI";

ptBR["lti:list-tools:title"] = "Gerenciar Ferramentas LTI";
ptBR["lti:list-tools:thead:tool-name"] = "Nome da ferramenta";
ptBR["lti:list-tools:thead:tool-details"] = "Detalhes";
ptBR["lti:list-tools:tool-field:id"] = "ID";
ptBR["lti:list-tools:tool-field:description"] = "Descrição";
ptBR["lti:list-tools:tool-field:home-page-uri"] = "Site";
ptBR["lti:list-tools:buttons:list-deployments"] = "Ver deployments";
ptBR["lti:list-tools:buttons:tool-details"] = "Ver mais detalhes";
ptBR["lti:list-tools:no-tools-registered"] =
  "Não há nenhuma ferramenta registrada ainda.";
ptBR["lti:list-tools:buttons:register-new-tool"] =
  "Registrar uma nova ferramenta";

ptBR["lti:tools-details:title"] = ({ toolName }: { toolName?: string }) => {
  if (!toolName) return "Registro de ferramenta";
  return `Registro da ferramenta ${toolName}`;
};
ptBR["lti:tools-details:invalid-tab-selected"] =
  "Aba inválida. Escolha uma aba de visualização existente.";
ptBR["lti:tools-details:thead:id"] = "ID";
ptBR["lti:tools-details:thead:name"] = "Nome";
ptBR["lti:tools-details:thead:description"] = "Descrição";
ptBR["lti:tools-details:thead:grant-types"] = "Grant Types LTI";
ptBR["lti:tools-details:thead:initiate-uri"] = "Link de Iniciação";
ptBR["lti:tools-details:thead:home-page-uri"] = "Website da Ferramenta";
ptBR["lti:tools-details:thead:logo-uri"] = "Logo";
ptBR["lti:tools-details:thead:tos-uri"] = "Termos de Serviço";
ptBR["lti:tools-details:thead:policy-uri"] = "Políticas da Ferramenta";
ptBR["lti:tools-details:thead:contacts"] = "Contatos";
ptBR["lti:tools-details:thead:registered-msgs"] = "Mensagens Registradas";
ptBR["lti:tools-details:thead:required-claims"] = "Claims Obrigatórios";
ptBR["lti:tools-details:buttons:new-deploy"] = "Fazer novo deploy";
ptBR["lti:tools-details:thead:deployment-id"] = "ID";
ptBR["lti:tools-details:thead:deployment-label"] = "Etiqueta";
ptBR["lti:tools-details:no-tool-deployments"] =
  "Essa ferramenta ainda não possui nenhum deployment.";

ptBR["lti:deploy-tool:popup-title"] = "Realizar novo deploy";
ptBR["lti:deploy-tool:errors:label-invalid-type"] =
  "A etiqueta precisa ser um texto válido.";
ptBR["lti:deploy-tool:errors:label-too-short"] = "A etiqueta é muito curta.";
ptBR["lti:deploy-tool:errors:label-too-long"] = "A etiqueta é muito longa.";
ptBR["lti:deploy-tool:success-message"] = ({ id, label }) =>
  `Ferramenta instalada com sucesso etiquetada como ${label} e com ID ${id}.`;
