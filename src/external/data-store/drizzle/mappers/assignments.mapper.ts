import type * as schema from "drizzle/schema";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { trimNullProperties } from "@/utils/trim-null-properties";

type Schema = ExtractTablesWithRelations<typeof schema>;

type AssignmentsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["assignmentsT"]>;

type AssignmentRow = BuildQueryResult<Schema, Schema["assignmentsT"], typeof requiredQueryConfig>;

const requiredQueryConfig = {} as const satisfies AssignmentsQueryConfig;

function intoRow(assignment: Assignment): AssignmentRow {
  return {
    id: assignment.getId().toString(),
    title: assignment.getTitle(),
    courseId: assignment.getCourseId()?.toString() ?? null,
    createdAt: assignment.getCreatedAt(),
    deadline: assignment.getDeadline() ?? null,
    maxScore: assignment.getMaxScore(),
    releasedAt: assignment.getReleasedAt() ?? null,
  };
}

function fromRow(row: AssignmentRow): Assignment {
  return pipe(row, trimNullProperties, Assignment.createUnchecked);
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
