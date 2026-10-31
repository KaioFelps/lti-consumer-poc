import type { UUID } from "common/src/types/uuid.js";
import { ltiLineItemsT } from "drizzle/schema.js";
import { either } from "fp-ts";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import ltiLineItemsMapper from "@/external/data-store/drizzle/mappers/lti-line-items.mapper.js";
import lineItemFactory from "$/tests/common/factories/line-item.factory.js";

type OriginalFactoryParams = Exclude<
  Parameters<typeof lineItemFactory.createMinimal>[0],
  undefined
>;
type FactoryParams = Partial<OriginalFactoryParams> & {
  assignmentId?: UUID;
  owningToolId: string;
};

async function createAndPersist(drizzle: DrizzleClient, overridingProps: FactoryParams) {
  const { assignmentId, owningToolId, ...props } = overridingProps;
  props.tag ||= undefined;

  const lineItem = lineItemFactory.createMinimal(props);
  const isOrphan = !assignmentId && !lineItem.externalResource;

  const lineItemPayload = ltiLineItemsMapper.intoRow(
    lineItem,
    assignmentId?.toString() ?? null,
    isOrphan ? owningToolId : null,
  );

  assert(either.isRight(lineItemPayload));
  await drizzle.getClient().insert(ltiLineItemsT).values(lineItemPayload.right);

  return lineItem;
}

export default {
  ...lineItemFactory,
  createAndPersist,
};
