import courseContextFactory from "test/factories/course-context.factory";
import deploymentFactory from "test/factories/deployment.factory";
import externalLtiResourceFactory from "test/factories/external-lti-resource.factory";
import ltiAssignmentFactory from "test/factories/lti-assignment.factory";
import ltiResourceLinkFactory from "test/factories/lti-resource-link.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import personFactory from "test/factories/person.factory";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";

export type EntitiesFactoryGenerator = ReturnType<typeof generateEntitiesFactory>;

export function generateEntitiesFactory(drizzle: DrizzleClient) {
  const getValidItems = async () => {
    const person = await personFactory.createAndPersist(drizzle);
    const instructor = Instructor.createUnchecked({ person });

    const { course, courseContext } = await courseContextFactory.createAndPersist(drizzle, {
      instructor,
    });

    // lti stuff
    const tool = await ltiToolFactory.createAndPersist(drizzle, {
      scopes: [AssignmentAndGradeServiceScopes.Lineitem],
    });

    const deployment = await deploymentFactory.createAndPersist(drizzle, {
      context: courseContext,
      tool,
    });

    // every assignment connects to lti through a resource link
    const assignmentsResourceLink = await ltiResourceLinkFactory.createAndPersist(drizzle, {
      tool,
      deployment,
      context: courseContext,
    });

    // platform specific assignment
    const assignment = await ltiAssignmentFactory.createAndPersist(drizzle, {
      course,
      kind: AssignmentKind.ExternalLti,
      assignmentsResourceLink,
    });

    // assignment relating local assignment to tool's resource
    const resource = await externalLtiResourceFactory.createAndPersist(drizzle, {
      tool,
      assignment,
      context: courseContext,
    });

    return { assignmentsResourceLink, assignment, courseContext, resource, tool, course };
  };

  return getValidItems;
}
