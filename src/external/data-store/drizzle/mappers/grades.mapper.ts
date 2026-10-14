import { type UUID } from "common/src/types/uuid";
import * as schema from "drizzle/schema";
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

type ScoresQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiScoresT"]>;

type ScoreRow = BuildQueryResult<Schema, Schema["ltiScoresT"], typeof ltiScoreRequiredQueryConfig>;

const ltiScoreRequiredQueryConfig = {
  with: {
    student: { columns: { id: true } },
    lineItem: {
      with: { ltiAssignment: { columns: { assignmentId: true } } },
      columns: { gradesReleased: true, id: true },
    },
  },
} as const satisfies ScoresQueryConfig;

function fromLtiScoreRow(assignmentId: UUID, courseId: UUID, row: ScoreRow): Grade {
  return Grade.createUnchecked({
    assignmentId,
    courseId,
    gradedAt: new Date(row.submittedAt ?? row.timestamp),
    score: row.scoreGiven!,
    maxScore: row.scoreMaximum ?? 1,
    released: row.lineItem.gradesReleased ?? true,
    studentId: row.userId,
    lastUpdatedAt:
      (row.submittedAt ?? row.timestamp) !== row.timestamp ? new Date(row.timestamp) : undefined,
  });
}

export default {
  intoRow,
  fromRow,
  fromLtiScoreRow,
  requiredQueryConfig,
  ltiScoreRequiredQueryConfig,
};
