import { ltiAssignmentsT } from "drizzle/schema";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { LtiResourceLink } from "$/core/resource-link";
import assignmentFactory from "./assignment.factory";
import ltiResourceLinkFactory from "./lti-resource-link.factory";

type AssignmentProps = Assignment["props"];

type FactoryParams = Partial<
  Omit<AssignmentProps, "courseId"> & { course: Course; assignmentsResourceLink: LtiResourceLink }
>;

function create(overrideProps: FactoryParams = {}) {
  return assignmentFactory.create({
    ...overrideProps,
    kind: AssignmentKind.ExternalLti,
  });
}

async function createAndPersist(drizzle: DrizzleClient, overrideProps: FactoryParams = {}) {
  let { assignmentsResourceLink, ...props } = overrideProps;
  assignmentsResourceLink ??= await ltiResourceLinkFactory.createAndPersist(drizzle);

  const assignment = await assignmentFactory.createAndPersist(drizzle, {
    ...props,
    kind: AssignmentKind.ExternalLti,
  });

  await drizzle.getClient().insert(ltiAssignmentsT).values({
    assignmentId: assignment.getId().toString(),
    resourceLinkId: assignmentsResourceLink.id,
  });

  return assignment;
}

export default {
  create,
  createAndPersist,
};
