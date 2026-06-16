import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import {
  assignmentsT,
  coursesT,
  externalLtiResourcesT,
  ltiAssignmentsT,
  ltiContexts,
  ltiLineItemsT,
  ltiResourceLinks,
  ltiToolDeployments,
  usersTable,
} from "drizzle/schema";
import { eq } from "drizzle-orm";
import { either as e } from "fp-ts";
import { createExternalLtiResource } from "ltilib/tests/common/factories/external-lti-resource.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { type App } from "supertest/types";
import { getTestingApp } from "test";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { Person } from "@/modules/identity/person/person.entity";
import { CPF } from "@/modules/identity/person/value-objects/cpf";
import { SystemRole } from "@/modules/identity/user/enums/system-role";
import { CourseContextAdapter } from "@/modules/lti/advantage/context/adapters/course-context.adapter";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { LtiResourceLink } from "$/core/resource-link";
import { DrizzleClient } from "../client";
import assignmentsMapper from "../mappers/assignments.mapper";
import coursesMapper from "../mappers/courses.mapper";
import ltiResourceLinksMapper from "../mappers/lti-resource-links.mapper";
import ltiToolsDeploymentsMapper from "../mappers/lti-tools-deployments.mapper";
import peopleMapper from "../mappers/people.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

describe("[Repository] Drizzle LTI Line Items Repository", () => {
  let app: INestApplication<App>;
  let rut: LtiLineItemsRepository;
  let toolsRepo: LtiToolsRepository;
  let transactionManager: DrizzleTransactionManager;
  let drizzle: DrizzleClient;

  beforeAll(async () => {
    app = await getTestingApp();
    rut = app.get(LtiLineItemsRepository);
    toolsRepo = app.get(LtiToolsRepository);
    transactionManager = app.get(DrizzleTransactionManager);
    drizzle = app.get(DrizzleClient);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getValidItems = async () => {
    const instructor = Instructor.createUnchecked({
      person: Person.create({
        birthDate: new Date(),
        cpf: CPF.createUnchecked("11122233345"),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        surname: faker.person.lastName(),
        passwordHash: "123456",
        username: faker.internet.username(),
        gender: undefined,
        profilePictureUrl: undefined,
        systemRole: SystemRole.Admin,
      }),
    });

    const course = Course.create({
      instructorId: instructor.getId(),
      title: "Test Course",
    });

    const courseContext = new CourseContextAdapter(course).getContext();

    const assignmentResult = Assignment.create({
      kind: AssignmentKind.ExternalLti,
      maxScore: 10,
      title: "LTI External Assignment",
      courseId: course.getId(),
    });

    assert(e.isRight(assignmentResult));

    // lti stuff
    const tool = createTool({ scopes: [AssignmentAndGradeServiceScopes.Lineitem] });
    const deployment = createToolDeployment({ context: courseContext, tool });

    // platform specific assignment
    const assignment = assignmentResult.right;

    // assignment relating local assignment to tool's resource
    const resource = createExternalLtiResource({
      tool,
      context: courseContext,
      localResourceId: assignment.getId().toString(),
      externalToolResourceId: "quiz-231",
    });

    // every assignment connects to lti through a resource link
    const assignmentsResourceLink = LtiResourceLink.create({
      deploymentId: deployment.id,
      toolId: tool.id,
      contextId: courseContext.id,
    });

    await transactionManager.runInTransaction(async () => {
      const client = transactionManager.getTx()!;

      await client.insert(usersTable).values(peopleMapper.intoRow(instructor.getPerson()));
      await client.insert(coursesT).values(coursesMapper.intoRow(course));

      await client.insert(ltiContexts).values({
        concreteContextId: course.getId().toString(),
        concreteContextType: ContextConcreteType.Course,
      });

      await client.insert(assignmentsT).values(assignmentsMapper.intoRow(assignment));

      await toolsRepo.upsertTool(new LtiTool(tool));

      await client.insert(externalLtiResourcesT).values({
        externalToolResourceId: resource.externalToolResourceId,
        id: resource.localResourceId,
        toolId: resource.tool.id,
      });

      await client.insert(ltiToolDeployments).values(
        ltiToolsDeploymentsMapper.intoRow(
          LtiToolDeployment.create({
            label: "test",
            toolId: deployment.toolId,
            id: deployment.id,
          }),
        ),
      );

      const resourceLinkPayload = ltiResourceLinksMapper.intoRow(assignmentsResourceLink);
      assert(e.isRight(resourceLinkPayload));
      await client.insert(ltiResourceLinks).values(resourceLinkPayload.right);

      await client.insert(ltiAssignmentsT).values({
        assignmentId: assignment.getId().toString(),
        resourceLinkId: assignmentsResourceLink.id,
      });
    });

    return { assignmentsResourceLink, assignment, courseContext, resource, tool };
  };

  it("should associate the line item to the respective activity through ltilib LineItem entity", async () => {
    const { assignment, assignmentsResourceLink, courseContext, resource } = await getValidItems();

    // a lti line item;
    //
    // it has no access to the assignment, since it's a ltilib entity and
    // but the platform's implementation of ltilib line items repository should be able
    // to connect this line item to the assignment through the resource link attached to
    // the line item
    const lineItemResult = LtiLineItem.create({
      context: courseContext,
      label: faker.lorem.sentence(),
      scoreMaximum: 10,
      resourceLink: assignmentsResourceLink,
      externalResource: resource,
    });

    assert(e.isRight(lineItemResult));

    const lineItem = lineItemResult.right;
    expect(lineItem.resourceLink).toBeDefined();

    const result = await rut.save(lineItem);
    assert(e.isRight(result));

    const lineItemRowInDb = await drizzle.getClient().query.ltiLineItemsT.findFirst({
      where: eq(ltiLineItemsT.id, lineItem.id.toString()),
      with: { ltiAssignment: true },
    });

    expect(lineItemRowInDb).toBeDefined();
    expect(lineItemRowInDb?.ltiAssignment).not.toBeNull();

    const { assignmentId, resourceLinkId } = lineItemRowInDb!.ltiAssignment!;
    expect(assignmentId).toEqual(assignment.getId().toString());
    expect(resourceLinkId).toEqual(assignmentsResourceLink.id);
  });
});
