import { ptBR } from "@/message-string/internal/translations/pt-BR";

ptBR["grading:errors:assignment-not-gradable"] = ({ title }) =>
  `A atividade '${title}' não está apta a ser pontuada.`;
ptBR["grading:scores:errors:too-big"] = ({ maximum }) =>
  `A nota atribuída deve ser, no máximo, ${maximum}.`;
ptBR["grading:scores:errors:too-small"] = ({ minimum }) =>
  `A nota atribuída deve ser maior que ${minimum}.`;
ptBR["grading:errors:instructor-not-found"] = ({ personId }) =>
  `Não foi possível encontrar nenhum professor com ID '${personId}'.`;
ptBR["grading:errors:student-not-found"] = ({ personId }) =>
  `Não foi possível encontrar nenhum aluno com ID '${personId}'.`;
ptBR["grading:assignments-repository:errors:assignment-not-found"] = ({ assignmentId }) =>
  `Não foi encontrada nenhuma atividade com ID '${assignmentId}'.`;
ptBR["grading:assignments-repository:errors:grade-not-found"] = ({
  assignmentTitle,
  assignmentId,
  studentName,
  studentId,
}) => {
  const assignmentExcerpt = assignmentTitle
    ? `na a atividade '${assignmentTitle}'`
    : `na atividade de ID '${assignmentId}'`;
  const studentExcerpt = studentName ? `do aluno ${studentName}` : `do aluno de ID '${studentId}'`;
  return `Não foi possível encontrar uma nota ${studentExcerpt} ${assignmentExcerpt}.`;
};
ptBR["grading:errors:instructor-unauthorized-in-course"] = ({ instructorName, courseTitle }) =>
  `${instructorName} não é instrutor do curso ${courseTitle}, portanto não está autorizado.`;
ptBR["grading:courses-repository:errors:not-found"] = ({ courseId }) =>
  `Não foi encontrado nenhum curso com ID '${courseId}'.`;

ptBR["assignments:errors:deadline-cannot-be-past"] =
  "O prazo para esta atividade deve ser uma data no futuro.";
ptBR["assignments:errors:max-score-too-big"] = ({ maximum: maxSmallInt }) =>
  `Sua atividade deve limitar suas pontuações a ${maxSmallInt} pontos.`;

ptBR["assignments:errors:max-score-too-small"] = ({ minimum }) =>
  `A pontuação limite da atividade deve ser, no mínimo, ${minimum} pontos.`;

ptBR["assignments:create-assignment:title"] = "Criar uma nova atividade";

ptBR["assignments:create-assignment:title-must-be-string"] =
  "O título precisa ser um texto... O que você está fazendo?!";
ptBR["assignments:create-assignment:title-must-not-be-empty"] =
  "O título da atividade não pode estar em branco.";
ptBR["assignments:create-assignment:title-too-long"] = ({ maximum }) =>
  `O título da atividade deve ser limitado a ${maximum} caracteres.`;
ptBR["assignments:create-assignment:max-score-must-be-number"] =
  "Selecione um valor numérico válido para ser a pontuação máxima desta atividade.";
ptBR["assignments:create-assignment:max-score-too-short"] = ({ minimum }) =>
  `A pontuação máxima deve ser, no mínimo, ${minimum}.`;
ptBR["assignments:create-assignment:max-score-too-long"] = ({ maximum }) =>
  `A pontuação máxima permitida não deve ultrapassar ${maximum}.`;
ptBR["assignments:create-assignment:released-date-must-be-date"] =
  "A data de lançamento informada é inválida.";
ptBR["assignments:create-assignment:deadline-must-be-date"] =
  "O prazo de entrega informado precisa ser uma data válida.";
