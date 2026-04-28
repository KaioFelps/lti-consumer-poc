import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["courses:errors:not-an-instructor"] = ({ name }) =>
  `${name} não está autorizado a ministrar cursos.`;

ptBR["courses:navigation:courses"] = "Cursos";
ptBR["courses:navigation:list-courses"] = "Todos os cursos";
ptBR["courses:navigation:create"] = "Criar um novo curso";

ptBR["courses:list:title"] = "Cursos da plataforma";

ptBR["courses:create:title"] = "Criar um novo curso";

ptBR["courses:create:errors:title-must-be-text"] =
  "O título do curso precisa ser um texto. O que você está fazendo?!";

ptBR["courses:create:errors:title-too-big"] = ({ maximum }) =>
  `O título deve possuir, no máximo, ${maximum} ${maximum === 1 ? "caractere" : "caracteres"}.`;

ptBR["courses:create:errors:title-too-small"] = ({ minimum }) =>
  `O título deve possuir, no mínimo, ${minimum} ${minimum === 1 ? "caractere" : "caracteres"}.`;

ptBR["courses:create:form:labels:title"] = "Título do curso";

ptBR["courses:create:form:buttons:create"] = "Criar ofrm";
