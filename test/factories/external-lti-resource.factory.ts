import { generateUUID } from "common/src/types/uuid.js";
import { externalLtiResourcesT } from "drizzle/schema.js";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity.js";
import { CourseContextAdapter } from "@/modules/lti/advantage/context/adapters/course-context.adapter.js";
import { createExternalLtiResource } from "$/tests/common/factories/external-lti-resource.factory.js";
import assignmentFactory from "./assignment.factory.js";
import courseFactory from "./course.factory.js";
import ltiToolFactory from "./lti-tool.factory.js";

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
