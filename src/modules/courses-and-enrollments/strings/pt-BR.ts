import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["courses:errors:not-an-instructor"] = ({ name }) =>
  `${name} não está autorizado a ministrar cursos.`;

ptBR["courses:navigation:courses"] = "Cursos";
ptBR["courses:navigation:list-courses"] = "Todos os cursos";
ptBR["courses:navigation:create"] = "Criar um novo curso";

ptBR["courses:list:title"] = "Cursos da plataforma";
ptBR["courses:list:no-courses"] = "Nenhum curso criado até o momento. Que tal criar um?";
ptBR["courses:list:thead:title"] = "Curso";
ptBR["courses:list:thead:instructor"] = "Professor";
ptBR["courses:list:buttons:add-new-course"] = "Crie um novo curso";
ptBR["courses:list:buttons:view-course"] = "Ver detalhes do curso";

ptBR["courses:create:title"] = "Criar um novo curso";

ptBR["courses:create:errors:title-must-be-text"] =
  "O título do curso precisa ser um texto. O que você está fazendo?!";

ptBR["courses:create:errors:title-too-big"] = ({ maximum }) =>
  `O título deve possuir, no máximo, ${maximum} ${maximum === 1 ? "caractere" : "caracteres"}.`;

ptBR["courses:create:errors:title-too-small"] = ({ minimum }) =>
  `O título deve possuir, no mínimo, ${minimum} ${minimum === 1 ? "caractere" : "caracteres"}.`;

ptBR["courses:create:form:labels:title"] = "Título do curso";

ptBR["courses:create:form:buttons:create"] = "Criar curso";

ptBR["courses:details:author-section-title"] = "Professor do curso";
ptBR["courses:details:author-name"] = "Nome";
ptBR["courses:details:author-email"] = "E-mail de contato";
ptBR["courses:details:assignments-section-title"] = "Atividades disponíveis";
ptBR["courses:details:content:no-assignments-msg"] =
  "Nenhuma atividade disponível para este curso.";
ptBR["courses:details:buttons:add-new-assignment"] = "Adicionar nova atividade";
ptBR["courses:details:assignments:max-score"] = "Pontuação máxima";
ptBR["courses:details:assignments:deadline"] = "Prazo de entrega";
ptBR["courses:details:assignments:released-at"] = "Data de lançamento";

ptBR["courses:details:buttons:view-assignment-details"] = "Ver detalhes da atividade";
