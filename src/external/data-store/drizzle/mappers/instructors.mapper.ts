import type * as schema from "drizzle/schema.js";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity.js";
import peopleMapper from "./people.mapper.js";

type Schema = ExtractTablesWithRelations<typeof schema>;

type InstructorsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["coursesT"]>;

type PeopleRow = BuildQueryResult<Schema, Schema["usersTable"], typeof requiredQueryConfig>;

const requiredQueryConfig = {} as const satisfies InstructorsQueryConfig;

function intoRow(instructor: Instructor): PeopleRow {
  return peopleMapper.intoRow(instructor.getPerson());
}

function fromRow(row: PeopleRow): Instructor {
  const person = peopleMapper.fromRow(row);
  return Instructor.createUnchecked({ person });
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
