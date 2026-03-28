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
    resourceLink,
    externalResource,
    tag = faker.lorem.word(),
    gradesReleased = faker.datatype.boolean(),
  }: Omit<CreateResourceLinkConstructorArgs, "context"> = {},
): LtiLineItem {
  const resolvedContext = externalResource?.context ?? context;

  resourceLink ??= createResourceLink({ contextId: resolvedContext.id, tool });
  externalResource ??= createExternalLtiResource({ context: resolvedContext, tool });

  if (resourceLink.contextId !== resolvedContext.id) {
    throw new Error(
      `Called \`createFullLineItem\` with an instance of ${LtiLineItem.name}` +
        " that belongs to a different context than the one passed to the factory.",
    );
  }

  return createMinimalLineItem({
    startDateTime,
    endDateTime,
    resourceLink,
    externalResource,
    tag,
    gradesReleased,
    context: resolvedContext,
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
  context = createContext(),
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
    context,
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
