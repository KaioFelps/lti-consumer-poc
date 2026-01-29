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
ptBR["lti:tools-details:buttons:delete-deployment"] = "Apagar deployment";
ptBR["lti:tools-details:buttons:see-assoc-resource-links"] =
  "Ver links de recurso associados";

ptBR["lti:deploy-tool:popup-title"] = "Realizar novo deploy";
ptBR["lti:deploy-tool:errors:label-invalid-type"] =
  "A etiqueta precisa ser um texto válido.";
ptBR["lti:deploy-tool:errors:label-too-short"] = "A etiqueta é muito curta.";
ptBR["lti:deploy-tool:errors:label-too-long"] = "A etiqueta é muito longa.";
ptBR["lti:deploy-tool:success-message"] = ({ id, label }) =>
  `Ferramenta instalada com sucesso etiquetada como ${label} e com ID ${id}.`;

ptBR["lti:delete-tool-deployment:"];
ptBR["lti:delete-tool-deployment:warning-p1"] =
  "Deletar esse deployment é uma ação irreversível e acarretará na " +
  "remoção de outras informações relacionadas a esta implantação.";
ptBR["lti:delete-tool-deployment:success-message"] =
  "Deployment removido com sucesso.";

ptBR["lti:list-resource-links:deployment-id-required"] =
  "O parâmetro de busca 'toolId' é obrigatório.";
ptBR["lti:list-resource-links:title"] = ({ deploymentLabel }) =>
  `Links de recursos associados ao deployment ${deploymentLabel}`;
ptBR["lti:list-resource-links:no-resource-links-p1"] =
  "Ainda não existem links de recursos associados a este deployment.";
ptBR["lti:list-resource-links:buttons:new-resource-link"] =
  "Novo link de recurso";
ptBR["lti:list-resource-links:thead:link-id"] = "ID";
ptBR["lti:list-resource-links:thead:link-url"] = "URL";
ptBR["lti:list-resource-links:thead:link-title"] = "Título";
ptBR["lti:list-resource-links:thead:link-description"] = "Descrição";
ptBR["lti:list-resource-links:thead:link-placements"] =
  "Posicionamentos do Link";
ptBR["lti:list-resource-links:no-message-placements"] =
  "Não há posicionamentos definidos para este tipo de link.";

ptBR[
  "lti:tools-deployments-repository:find-deployment-by-id:resource-not-found"
] = ({ deploymentId }) =>
  `Não foi possível encontrar um deployment com ID ${deploymentId}.`;

ptBR["lti:create-resource-link:deployment-id-is-required-and-valid"] =
  "O ID da implantação deve ser um UUID válido.";
ptBR["lti:create-resource-link:resource-link-is-valid-url"] =
  "O link do recurso precisa ser uma URL válida.";
ptBR["lti:create-resource-link:title-must-be-string"] =
  "O título do recurso precisa ser um texto.";
ptBR["lti:create-resource-link:title-must-not-be-empty"] =
  "O título do recurso não pode ser vazio.";
ptBR["lti:create-resource-link:description-must-be-string"] =
  "A descrição do recurso precisa ser um texto.";
ptBR["lti:create-resource-link:description-must-not-be-empty"] =
  "A descrição do recurso não pode estar vazia.";
ptBR["lti:list-resource-links:new-resource-link-dialog-title"] =
  "Criar novo link de recurso";
ptBR["lti:create-resource-link:form:deployment-id"] = "ID de implantação";
ptBR["lti:create-resource-link:form:resource-link"] = "Link do recurso";
ptBR["lti:create-resource-link:form:title"] = "Título";
ptBR["lti:create-resource-link:form:description"] = "Descrição";
ptBR["lti:create-resource-link:success-message"] = ({ linkTitle, linkId }) =>
  linkTitle
    ? `Link de recurso ${linkTitle} criado com sucesso!`
    : `Novo link de recurso criado com sucesso com ID ${linkId}.`;
ptBR["lti:create-resource-link:custom-parameters-key-must-be-string"] =
  "As chaves dos parâmetros customizados devem ser um um texto.";
ptBR["lti:create-resource-link:custom-parameters-value-must-be-string"] =
  "Os valores dos parâmetros customizados devem ser textos.";
ptBR["lti:create-resource-link:custom-parameters-must-be-a-key-value-map"] =
  "Os parâmetros customizados devem ser um objeto chave-valor.";

ptBR["lti:new-resource-link-param:form:title"] = "Parâmetros do link";
ptBR["lti:new-resource-link-param:form:param-key"] = "Chave do parâmetro";
ptBR["lti:new-resource-link-param:form:param-key"] = "Valor do parâmetro";

ptBR["lti:delete-resource-link:success-message"] = ({ resourceLinkId }) =>
  `Link de recurso de ID "${resourceLinkId}" deletado com sucesso.`;
ptBR["lti:delete-resource-link:warning-p1"] =
  "Deletar este link de recurso é uma ação irreversível. Tenha certeza antes de prosseguir.";

ptBR["lti:resource-links:find-by-id:resource-not-found"] = ({
  resourceLinkId,
}) => `Não foi possível encontrar um link com ID "${resourceLinkId}".`;
