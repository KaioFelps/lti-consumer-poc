import { faker } from "@faker-js/faker";
import { coursesT } from "drizzle/schema.js";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import coursesMapper from "@/external/data-store/drizzle/mappers/courses.mapper.js";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity.js";
import personFactory from "./person.factory.js";

type CreateCourseParams = Course.ConstructorProps;

type FactoryParams = Partial<Omit<CreateCourseParams, "instructorId"> & { instructor: Instructor }>;

function create(overrideProps: FactoryParams = {}): Course {
  overrideProps.instructor ??= Instructor.createUnchecked({ person: personFactory.create() });

  const defaultProps: CreateCourseParams = {
    title: `${faker.commerce.productName()} Course`,
    instructorId: overrideProps.instructor.getId(),
  };

  return Course.create({
    ...defaultProps,
    ...overrideProps,
  });
}

async function createAndPersist(
  drizzle: DrizzleClient,
  overrideProps: FactoryParams = {},
): Promise<Course> {
  overrideProps.instructor ??= Instructor.createUnchecked({
    person: await personFactory.createAndPersist(drizzle),
  });

  const course = create(overrideProps);

  await drizzle.getClient().insert(coursesT).values(coursesMapper.intoRow(course));

  return course;
}

export default {
  create,
  createAndPersist,
};
