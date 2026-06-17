import { faker } from "@faker-js/faker";
import { coursesT } from "drizzle/schema";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import coursesMapper from "@/external/data-store/drizzle/mappers/courses.mapper";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import personFactory from "./person.factory";

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
