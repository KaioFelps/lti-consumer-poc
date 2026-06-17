import { generateUUID } from "common/src/types/uuid";
import { externalLtiResourcesT } from "drizzle/schema";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { CourseContextAdapter } from "@/modules/lti/advantage/context/adapters/course-context.adapter";
import assignmentFactory from "./assignment.factory";
import courseFactory from "./course.factory";
import ltiToolFactory from "./lti-tool.factory";

type OriginalFactoryParams = Exclude<Parameters<typeof createExternalLtiResource>[0], undefined>;
type FactoryParams = Partial<
  Omit<OriginalFactoryParams, "localResourceId"> & { assignment: Assignment }
>;

function create(overrideProps: FactoryParams = {}) {
  overrideProps.assignment ??= assignmentFactory.create();

  return createExternalLtiResource({
    tool: ltiToolFactory.create(),
    context: new CourseContextAdapter(courseFactory.create()).getContext(),
    externalToolResourceId: generateUUID(),
    localResourceId: overrideProps.assignment.getId().toString(),
    ...overrideProps,
  });
}

async function createAndPersist(drizzle: DrizzleClient, overrideProps: FactoryParams = {}) {
  const resource = create(overrideProps);

  await drizzle.getClient().insert(externalLtiResourcesT).values({
    externalToolResourceId: resource.externalToolResourceId,
    id: resource.localResourceId,
    toolId: resource.tool.id,
  });

  return resource;
}

export default {
  create: createExternalLtiResource,
  createAndPersist,
};
