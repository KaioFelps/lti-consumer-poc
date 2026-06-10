import { faker } from "@faker-js/faker";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getTestingApp } from "test";
import { getToolAndItsOidcAccessToken } from "test/fixtures/oidc";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { PeopleRepository } from "@/modules/identity/person/people.repository";
import { Person } from "@/modules/identity/person/person.entity";
import { CPF } from "@/modules/identity/person/value-objects/cpf";
import { SystemRole } from "@/modules/identity/user/enums/system-role";
import { Routes } from "@/routes";
import { mountContextId } from "../../advantage/context";
import { LtiToolsRepository } from "../../tools/lti-tools.repository";
import { ContextConcreteType } from "../enums/context-concrete-type";

/**
 * we're not covering points related to the server because the service got its own tests
 *
 * creating a line item doesn't actually enforce no 'accept' header, therefore we are
 * omitting these tests.
 */

describe("[e2e::LTI] Create Line Item", async () => {
  let app: INestApplication<App>;
  let toolsRepo: LtiToolsRepository;
  let peopleRepo: PeopleRepository;
  let coursesRepo: CoursesRepository;
  let accessToken: string;

  beforeAll(async () => {
    app = await getTestingApp();
    // TODO:
    // criar uma tool mockada e adicionar diretmaente o client metadata
    // porque assim podemos passar a jwk diretamente, evitando que o oidc provider
    // tente fazer uma requisição pra tool mockada — que não existe e, logo, nem
    // tem como responder a requisição...
    toolsRepo = app.get(LtiToolsRepository);
    peopleRepo = app.get(PeopleRepository);
    coursesRepo = app.get(CoursesRepository);
    await app.init();
  });

  beforeEach(async () => {
    const result = await getToolAndItsOidcAccessToken(app);
    accessToken = result.accessToken;
    await toolsRepo.upsertTool(result.tool);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should require a valid composed context id", async () => {
    const response = await request(app.getHttpServer())
      .post("/lti/ags/some-invalid-context-id/lineitems")
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .send({
        scoreMaximum: 100,
        label: "teste",
      });

    expect(response.status).toBe(400);
    console.log(response.body);
    expect(response.body["error"]).toEqual(expect.stringContaining("contexto"));
  });

  const validContentTypes = ["application/vnd.ims.lis.v2.lineitem+json"];

  it("should require valid 'content-type' header", async () => {
    const { accessToken, tool } = await getToolAndItsOidcAccessToken(app);
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
      title: "foo",
      instructorId: instructor.getId(),
    });

    await toolsRepo.upsertTool(tool);
    await peopleRepo.createPerson(instructor.getPerson());
    await coursesRepo.save(course);

    const endpoint = Routes.lti.ags.lineitems.container(
      mountContextId(course.getId().toString(), ContextConcreteType.Course),
    );

    const response = await request(app.getHttpServer())
      .post(endpoint)
      .set("authorization", `Bearer ${accessToken}`)
      .set("content-type", "application/json")
      .send({
        scoreMaximum: 100,
        label: "teste",
      });

    console.log(response.body);
    expect(response.status).toBe(415);
  });

  it("should allow custom parameters in the request body as per spec", async () => {});

  it("should support the specified body for creating a line item (as per spec)", async () => {});

  it("should create a line item when everything is conformant", async () => {});

  it("should not create another line item when there is already one with given 'resourceId' and 'tag'", async () => {});

  it("should correctly find the course context", async () => {});

  test("the returned line item 'id' should be the endpoint to access that line item", async () => {});
});
