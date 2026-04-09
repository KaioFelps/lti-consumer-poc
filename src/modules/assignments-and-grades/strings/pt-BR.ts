import { ptBR } from "@/message-string/internal/translations/pt-BR";

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
