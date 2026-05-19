import type * as schema from "drizzle/schema";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { CourseWithInstructor } from "@/modules/courses-and-enrollments/aggregates/course-with-instructor.aggregate";
import { trimNullProperties } from "@/utils/trim-null-properties";
import coursesMapper from "./courses.mapper";
import instructorsMapper from "./instructors.mapper";

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
