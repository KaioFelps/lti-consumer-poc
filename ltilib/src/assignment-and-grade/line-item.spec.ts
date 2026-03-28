/**
 * These tests ensure compliance with some of the domain rules specified by LTI AGS 2.0
 * related to line items properties.
 *
 * They do not exhaustively enforce primitive type checks (e.g., verifying that a number
 * is a number), as the service interfaces already enforce these types at the
 * "compilation" level.
 *
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { faker } from "@faker-js/faker";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { InvalidLineItemArgumentError } from "./errors/invalid-line-item-argument.error";
import { LtiLineItem } from "./line-item";

describe("[AGS] Line Item properties' domain rules", () => {
  const context = createContext();

  const VALID_PAYLOAD = {
    label: faker.lorem.sentence(),
    scoreMaximum: 60,
    context,
  } satisfies Parameters<typeof LtiLineItem.create>[0];

  describe("[3.2.7] `label`", () => {
    it("should never be blank", () => {
      const payload = { ...VALID_PAYLOAD, label: "" };
      const lineitem = LtiLineItem.create(payload);
      assert(e.isLeft(lineitem));
      expect(lineitem.left).toBeInstanceOf(InvalidLineItemArgumentError);
      expect(lineitem.left.field).toBe("label");
    });

    it("should never be nullish", () => {
      // pass undefined label on purpose to simulate some @ts-ignore or js client
      const payload = { ...VALID_PAYLOAD, label: undefined as unknown as string };
      const lineitem = LtiLineItem.create(payload);
      assert(e.isLeft(lineitem));
      expect(lineitem.left).toBeInstanceOf(InvalidLineItemArgumentError);
      expect(lineitem.left.field).toBe("label");
    });
  });

  describe("[3.2.8] `scoreMaximum`", () => {
    it("should never be nullish", () => {
      // pass undefined score on purpose to simulate some @ts-ignore or js client
      const payload = { ...VALID_PAYLOAD, scoreMaximum: undefined as unknown as number };
      const lineitem = LtiLineItem.create(payload);
      assert(e.isLeft(lineitem));
      expect(lineitem.left).toBeInstanceOf(InvalidLineItemArgumentError);
      expect(lineitem.left.field).toBe("scoreMaximum");
      expect(lineitem.left.reason).toBe("required");
    });

    it("should accept decimal values", () => {
      const payload = { ...VALID_PAYLOAD, scoreMaximum: 15.5 };
      const lineitem = LtiLineItem.create(payload);
      assert(e.isRight(lineitem));
      expect(lineitem.right.scoreMaximum).toBe(15.5);
    });

    it("should be always greater than 0", () => {
      const payload = { ...VALID_PAYLOAD, scoreMaximum: -1 };
      const lineitem = LtiLineItem.create(payload);
      assert(e.isLeft(lineitem));
      expect(lineitem.left).toBeInstanceOf(InvalidLineItemArgumentError);
      expect(lineitem.left.field).toBe("scoreMaximum");
      expect(lineitem.left.reason).toBe("must_be_greater_than_zero");
    });
  });

  it("[3.1.2] should store custom parameters", () => {
    const customParameters = {
      "https://my-tool.com/customprop/1": true,
      "https://my-tool.com/customprop/2": 100,
    };

    const lineitem = LtiLineItem.create({
      ...VALID_PAYLOAD,
      customParameters,
    });

    assert(e.isRight(lineitem));
    expect(lineitem.right.customParameters).toMatchObject(customParameters);
  });

  it("[3.1.2] should ignore custom parameters which keys are not fully qualified URLs", () => {
    const customParameters = {
      "https://my-tool.com/customprop/1": true,
      "https://my-tool.com/customprop/2": 100,
      invalidKey: "foo",
    };

    const lineitem = LtiLineItem.create({
      ...VALID_PAYLOAD,
      customParameters,
    });

    assert(e.isRight(lineitem));
    expect(lineitem.right.customParameters).not.toMatchObject(customParameters);

    const { invalidKey: _, ...validCustomParameters } = customParameters;
    expect(lineitem.right.customParameters).toMatchObject(validCustomParameters);
  });
});
