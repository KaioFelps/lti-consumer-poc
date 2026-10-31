import { ltiAssignmentsT } from "drizzle/schema.js";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity.js";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind.js";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import assignmentFactory from "./assignment.factory.js";
import ltiResourceLinkFactory from "./lti-resource-link.factory.js";

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
