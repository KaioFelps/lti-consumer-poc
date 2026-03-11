import { faker } from "@faker-js/faker";
import { either } from "fp-ts";
import { ILtiLineItem, LtiLineItem } from "$/assignment-and-grade/line-item";
import { Context } from "$/core/context";
import { LtiTool } from "$/core/tool";
import { createContext } from "./context.factory";
import { createExternalLtiResource } from "./external-lti-resource.factory";
import { createResourceLink } from "./resource-link.factory";
import { createTool } from "./tool.factory";

type CreateResourceLinkConstructorArgs = Partial<ILtiLineItem>;

type CreateFullLineItemExtraArgs = {
  context?: Context;
  tool?: LtiTool;
};

export function createFullLineItem(
  { context = createContext(), tool = createTool() }: CreateFullLineItemExtraArgs = {},
  {
    startDateTime = faker.date.soon({ days: 2 }),
    endDateTime = faker.datatype.boolean()
      ? faker.date.soon({ days: 10, refDate: startDateTime })
      : undefined,
    resourceLink = createResourceLink({ contextId: context.id, tool }),
    externalResource = createExternalLtiResource({ context, tool }),
    tag = faker.lorem.word(),
    gradesReleased = faker.datatype.boolean(),
  }: CreateResourceLinkConstructorArgs = {},
): LtiLineItem {
  return createMinimalLineItem({
    startDateTime,
    endDateTime,
    resourceLink,
    externalResource,
    tag,
    gradesReleased,
  });
}

export function createMinimalLineItem({
  customParameters,
  endDateTime,
  externalResource,
  gradesReleased,
  id,
  label = faker.lorem.sentence(),
  resourceLink,
  scoreMaximum = faker.number.int({ min: 1, max: 100 }),
  startDateTime,
  tag,
}: CreateResourceLinkConstructorArgs = {}): LtiLineItem {
  const lineitem = LtiLineItem.create({
    label,
    scoreMaximum,
    customParameters,
    endDateTime,
    externalResource,
    gradesReleased,
    id,
    resourceLink,
    startDateTime,
    tag,
  });

  assert(
    either.isRight(lineitem),
    `\`createMinimalLineItem\` factory could not produce valid ${LtiLineItem.name} instances`,
  );

  return lineitem.right;
}

export default {
  createMinimalLineItem,
  createFullLineItem,
  /**
   * Same as `createMinimalLineItem`.
   */
  createMinimal: createMinimalLineItem,
  /**
   * Same as `createFullLineItem`.
   */
  createFull: createFullLineItem,
};
