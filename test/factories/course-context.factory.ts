import { ltiContexts } from "drizzle/schema";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { CourseContextAdapter } from "@/modules/lti/advantage/context/adapters/course-context.adapter";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import courseFactory from "./course.factory";

type Params = Parameters<typeof courseFactory.create>[0];

function create(params: Params = {}) {
  const course = courseFactory.create(params);
  const courseContext = new CourseContextAdapter(course).getContext();
  return { course, courseContext };
}

async function createAndPersist(drizzle: DrizzleClient, params: Params) {
  const course = await courseFactory.createAndPersist(drizzle, params);
  const courseContext = new CourseContextAdapter(course).getContext();

  await drizzle.getClient().insert(ltiContexts).values({
    concreteContextId: course.getId().toString(),
    concreteContextType: ContextConcreteType.Course,
  });

  return { course, courseContext };
}

export default {
  create,
  createAndPersist,
};
