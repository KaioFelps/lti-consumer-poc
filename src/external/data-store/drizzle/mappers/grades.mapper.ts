import type * as schema from "drizzle/schema";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { Grade } from "@/modules/assignments-and-grades/entities/grade.entity";
import { trimNullProperties } from "@/utils/trim-null-properties";

type Schema = ExtractTablesWithRelations<typeof schema>;

type GradesQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["gradesT"]>;

type GradeRow = BuildQueryResult<Schema, Schema["gradesT"], typeof requiredQueryConfig>;

const requiredQueryConfig = {} as const satisfies GradesQueryConfig;

function intoRow(grade: Grade): GradeRow {
  return {
    assignmentId: grade.getActivityId().toString(),
    courseId: grade.getCourseId().toString(),
    lastUpdatedAt: grade.getLastUpdatedAt() ?? null,
    maxScore: grade.getMaxScore(),
    released: grade.isReleased(),
    score: grade.getScore(),
    studentId: grade.getStudentId().toString(),
    gradedAt: grade.getGradedAt(),
  };
}

function fromRow(row: GradeRow): Grade {
  return pipe(row, trimNullProperties, Grade.createUnchecked);
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
