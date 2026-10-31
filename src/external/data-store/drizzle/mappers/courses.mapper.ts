import type * as schema from "drizzle/schema.js";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function.js";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { trimNullProperties } from "@/utils/trim-null-properties.js";

type Schema = ExtractTablesWithRelations<typeof schema>;

type CoursesQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["coursesT"]>;

type CourseRow = BuildQueryResult<Schema, Schema["coursesT"], typeof requiredQueryConfig>;

const requiredQueryConfig = {} as const satisfies CoursesQueryConfig;

function intoRow(course: Course): CourseRow {
  return {
    id: course.getId().toString(),
    instructorId: course.getInstructorId().toString(),
    title: course.getTitle(),
  };
}

function fromRow(row: CourseRow): Course {
  return pipe(row, trimNullProperties, Course.createUnchecked);
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
