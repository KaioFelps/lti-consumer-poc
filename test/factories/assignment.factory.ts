import { faker } from "@faker-js/faker";
import { assignmentsT } from "drizzle/schema.js";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import assignmentsMapper from "@/external/data-store/drizzle/mappers/assignments.mapper.js"; // Ajuste o caminho se necessário
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity.js";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind.js";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import courseFactory from "./course.factory.js";

type AssignmentProps = Assignment["props"];

type FactoryParams = Partial<Omit<AssignmentProps, "courseId"> & { course: Course }>;

function create(overrideProps: FactoryParams = {}) {
  overrideProps.course ??= courseFactory.create();

  const now = new Date();
  const defaultProps: AssignmentProps = {
    id: faker.string.uuid(),
    title: `${faker.commerce.productName()} Assignment`,
    maxScore: faker.number.int({ min: 1, max: 100 }),
    kind: AssignmentKind.Local,
    courseId: overrideProps.course.getId(),
    createdAt: now,
    releasedAt: undefined,
    deadline: undefined,
  };

  const { course: _, ...restProps } = overrideProps;

  return Assignment.createUnchecked({
    ...defaultProps,
    ...restProps,
  });
}

async function createAndPersist(drizzle: DrizzleClient, overrideProps: FactoryParams = {}) {
  overrideProps.course ??= await courseFactory.createAndPersist(drizzle);

  const assignment = create(overrideProps);

  await drizzle.getClient().insert(assignmentsT).values(assignmentsMapper.intoRow(assignment));

  return assignment;
}

export default {
  create,
  createAndPersist,
};
