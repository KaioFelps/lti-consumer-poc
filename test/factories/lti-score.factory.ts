import { ltiScoresT } from "drizzle/schema.js";
import { DrizzleClient } from "@/external/data-store/drizzle/client.js";
import scoresMapper from "@/external/data-store/drizzle/mappers/scores.mapper.js";
import scoreFactory from "$/tests/common/factories/score.factory.js";

type OriginalFactoryParams = Exclude<Parameters<typeof scoreFactory.createScore>[0], undefined>;

type FactoryParams = Partial<OriginalFactoryParams> & {
  lineItemId: string;
};

async function createAndPersist(drizzle: DrizzleClient, overridingProps: FactoryParams) {
  const { lineItemId, ...props } = overridingProps;
  const score = scoreFactory.createScore(props);
  const scorePayload = scoresMapper.intoRow(score, lineItemId);

  await drizzle.getClient().insert(ltiScoresT).values(scorePayload);

  return score;
}

export default {
  ...scoreFactory,
  createAndPersist,
};
