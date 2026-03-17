import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import * as jose from "jose";
import { JSDOM, VirtualConsole } from "jsdom";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { createMockKeySet } from "ltilib/tests/utils/create-jwks";
import { MessageType } from "$/claims/serialization";
import { Platform } from "../platform";
import { LtiResourceLink } from "../resource-link";
import { LtiTool } from "../tool";
import { UserIdentity } from "../user-identity";
import { MessageRequests } from ".";
import { LTIResourceLinkLaunchRequest } from "./resource-link-launch";

describe("[Core] Resource link Launch Request", async () => {
  const CUSTOM_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/custom";
  const LTI_VERSION_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/version";

  let keyset: Awaited<ReturnType<typeof createMockKeySet>>;
  let platform: Platform;

  beforeAll(async () => {
    keyset = await createMockKeySet();
    platform = await createPlatform({ jsonWebKey: keyset.jwk });
  });

  function getResourceLinkLaunchMessageParameters({
    resourceLink,
    tool,
  }: {
    resourceLink: LtiResourceLink;
    tool: LtiTool;
  }) {
    return {
      nonce: randomBytes(64).toString("hex"),
      platform,
      resolvedTargetLinkUrl: new URL(faker.internet.url()),
      resourceLink,
      state: randomBytes(64).toString("hex"),
      tool,
      agsClaim: undefined,
      context: createContext(),
      userIdentity: UserIdentity.create<never>({ id: generateUUID() }),
      userRoles: undefined,
    };
  }

  function getDataWithCustomProperties({
    resourceProps,
    toolProps,
    messageSchemaProps,
  }: {
    resourceProps?: Record<string, string>;
    toolProps?: Record<string, string>;
    messageSchemaProps?: Record<string, string>;
  } = {}) {
    const messageSchema = new LtiTool.SupportedMessage({
      type: MessageType.resourceLink,
      customParameters: messageSchemaProps ?? {},
    });
    const tool = createTool({ customParameters: toolProps, messages: [messageSchema] });
    const resourceLink = createResourceLink({ tool, customParameters: resourceProps });

    return { tool, resourceLink };
  }

  it("should prefer resource links custom parameters over message schema and tool record's custom parameters", async () => {
    const { resourceLink, tool } = getDataWithCustomProperties({
      messageSchemaProps: { foo: LtiTool.SupportedMessage.name },
      toolProps: { foo: LtiTool.name },
      resourceProps: { foo: LtiResourceLink.name },
    });

    const message = LTIResourceLinkLaunchRequest.create({
      ...getResourceLinkLaunchMessageParameters({ resourceLink, tool }),
    });

    assert(e.isRight(message), "it should be a valid message payload");

    const claims = message.right.intoLtiClaim();
    const customClaim = claims[CUSTOM_CLAIM];
    expect(customClaim).toHaveProperty("foo");
    expect(customClaim.foo).toBe(LtiResourceLink.name);
  });

  it("should prefer message schema's custom parameters over tool record's", async () => {
    const { resourceLink, tool } = getDataWithCustomProperties({
      messageSchemaProps: { foo: LtiTool.SupportedMessage.name },
      toolProps: { foo: LtiTool.name },
    });

    const message = LTIResourceLinkLaunchRequest.create({
      ...getResourceLinkLaunchMessageParameters({ resourceLink, tool }),
    });

    assert(e.isRight(message), "it should be a valid message payload");

    const claims = message.right.intoLtiClaim();
    const customClaim = claims[CUSTOM_CLAIM];
    expect(customClaim).toHaveProperty("foo");
    expect(customClaim.foo).toBe(LtiTool.SupportedMessage.name);
  });

  it("should include tool's custom parameters if there are any", async () => {
    const { resourceLink, tool } = getDataWithCustomProperties({
      toolProps: { foo: LtiTool.name },
    });

    const message = LTIResourceLinkLaunchRequest.create({
      ...getResourceLinkLaunchMessageParameters({ resourceLink, tool }),
    });

    assert(e.isRight(message), "it should be a valid message payload");

    const claims = message.right.intoLtiClaim();
    const customClaim = claims[CUSTOM_CLAIM];
    expect(customClaim).toHaveProperty("foo");
    expect(customClaim.foo).toBe(LtiTool.name);
  });

  it("should not include custom (claims) claim if there are no custom claims at all", async () => {
    const { resourceLink, tool } = getDataWithCustomProperties();

    const message = LTIResourceLinkLaunchRequest.create({
      ...getResourceLinkLaunchMessageParameters({ resourceLink, tool }),
    });

    assert(e.isRight(message), "it should be a valid message payload");

    const claims = message.right.intoLtiClaim();
    expect(claims[CUSTOM_CLAIM]).not.toBeDefined();
  });

  it("should include vendor extra claims in the final payload at the same level as other standard LTI claims", async () => {
    const vendorClaims = MessageRequests.VendorExtraClaims.create("https://my.lms.com", {
      foo: true,
    });

    assert(e.isRight(vendorClaims));

    const { resourceLink, tool } = getDataWithCustomProperties();

    const message = LTIResourceLinkLaunchRequest.create({
      ...getResourceLinkLaunchMessageParameters({ resourceLink, tool }),
    });

    assert(e.isRight(message));

    message.right.setVendorClaims(vendorClaims.right);

    const claims = message.right.intoLtiClaim();

    expect(claims).not.toHaveProperty("foo");
    expect(claims).toEqual(expect.objectContaining(vendorClaims.right.intoLtiClaim()));
  });

  describe("Auto-submitted Form", async () => {
    let launch: LTIResourceLinkLaunchRequest;
    let expectedState: string;
    let formHtml: string;

    beforeAll(async () => {
      const { resourceLink, tool } = getDataWithCustomProperties();

      const parameters = getResourceLinkLaunchMessageParameters({ resourceLink, tool });
      const message = LTIResourceLinkLaunchRequest.create(parameters);

      expectedState = parameters.state;

      assert(e.isRight(message), "it should be a valid message payload");
      launch = message.right;

      const formResult = await launch.intoForm();
      assert(e.isRight(formResult));
      formHtml = formResult.right;
    });

    it("should contain a field named 'id_token' containing the final id token", async () => {
      const dom = new JSDOM(formHtml, { virtualConsole: new VirtualConsole() });
      const document = dom.window.document;

      const input = document.querySelector<HTMLInputElement>("input[name=id_token]");
      expect(input, "form should contain a input named 'id_token'").not.toBeNull();

      const inputValue = input!.value;

      const parseToJwt = () => jose.jwtVerify(inputValue, keyset.publicKey);
      expect(async () => await parseToJwt()).not.toThrowError();

      const { payload } = await parseToJwt();
      expect(payload).toHaveProperty(LTI_VERSION_CLAIM);
      expect(payload[LTI_VERSION_CLAIM]).toBe("1.3.0");
    });

    it("should contain a field named 'state' containing the state from tool's launch authentication request", async () => {
      const dom = new JSDOM(formHtml, { virtualConsole: new VirtualConsole() });
      const document = dom.window.document;

      const input = document.querySelector<HTMLInputElement>("input[name=state]");
      expect(input, "form should contain a input named 'state'").not.toBeNull();

      expect(input!.value, "it should contain the same state passed to the message").toBe(
        expectedState,
      );
    });

    it("should have the method set to 'POST'", async () => {
      const dom = new JSDOM(formHtml, { virtualConsole: new VirtualConsole() });
      const document = dom.window.document;
      const form = document.querySelector("form");

      expect(form, "it should contain a form").not.toBeNull();
      expect(form?.method, "form's method should be 'POST'").toBe("post");
    });

    it("should auto-submit itself", async () => {
      const submitMock = vi.fn();

      const _dom = new JSDOM(formHtml, {
        runScripts: "dangerously",
        virtualConsole: new VirtualConsole(),
        beforeParse(window) {
          window.HTMLFormElement.prototype.submit = submitMock;
        },
      });

      expect(submitMock).toHaveBeenCalled();
    });
  });
});
