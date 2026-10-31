import type * as schema from "drizzle/schema.js";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function.js";
import { CourseWithInstructor } from "@/modules/courses-and-enrollments/aggregates/course-with-instructor.aggregate.js";
import { trimNullProperties } from "@/utils/trim-null-properties.js";
import coursesMapper from "./courses.mapper.js";
import instructorsMapper from "./instructors.mapper.js";

type Schema = ExtractTablesWithRelations<typeof schema>;

type CoursesQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["coursesT"]>;

type CourseRow = BuildQueryResult<Schema, Schema["coursesT"], typeof requiredQueryConfig>;

const requiredQueryConfig = { with: { instructor: true } } as const satisfies CoursesQueryConfig;

function fromRow(row: CourseRow): CourseWithInstructor {
  return pipe(row, trimNullProperties, (row) => {
    const course = coursesMapper.fromRow(row);
    const instructor = instructorsMapper.fromRow(row.instructor);
    return CourseWithInstructor.create({ course, instructor });
  });
}

export default {
  fromRow,
  requiredQueryConfig,
};
