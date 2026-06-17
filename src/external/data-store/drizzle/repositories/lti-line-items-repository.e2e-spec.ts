import { faker } from "@faker-js/faker";
import { type INestApplication } from "@nestjs/common";
import { ltiLineItemsT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { either as e } from "fp-ts";
import { type App } from "supertest/types";
import { getTestingApp } from "test";
import courseContextFactory from "test/factories/course-context.factory";
import deploymentFactory from "test/factories/deployment.factory";
import externalLtiResourceFactory from "test/factories/external-lti-resource.factory";
import ltiAssignmentFactory from "test/factories/lti-assignment.factory";
import ltiResourceLinkFactory from "test/factories/lti-resource-link.factory";
import ltiToolFactory from "test/factories/lti-tool.factory";
import personFactory from "test/factories/person.factory";
import { AssignmentKind } from "@/modules/assignments-and-grades/enums/assignment-kind";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { DrizzleClient } from "../client";

describe("[Repository] Drizzle LTI Line Items Repository", () => {
  let app: INestApplication<App>;
  let rut: LtiLineItemsRepository;
  let drizzle: DrizzleClient;

  beforeAll(async () => {
    app = await getTestingApp();
    rut = app.get(LtiLineItemsRepository);
    drizzle = app.get(DrizzleClient);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

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
