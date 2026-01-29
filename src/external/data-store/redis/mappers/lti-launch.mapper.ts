import { option as opt } from "fp-ts";
import { LtiLaunchData } from "$/core/launch-data";

type Payload = {
  launchId: string;
  resourceLinkId: string;
  userId: string;
};

function intoPayload(launch: LtiLaunchData): Payload {
  return {
    launchId: launch.id.toString(),
    resourceLinkId: launch.resourceLinkId.toString(),
    userId: launch.userId,
  };
}

function fromPayload(payload: Payload): LtiLaunchData {
  return LtiLaunchData.create({
    resourceLinkId: payload.resourceLinkId,
    userId: payload.userId,
    id: payload.launchId,
  });
}

// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
function checkIfExistsAndIsString(payload: any, property: string) {
  return property in payload && typeof payload[property] === "string";
}

function fromRawPayload(payload: unknown) {
  const isValidPayload =
    checkIfExistsAndIsString(payload, "launchId") &&
    checkIfExistsAndIsString(payload, "resourceLinkId") &&
    checkIfExistsAndIsString(payload, "userId");

  if (isValidPayload) return opt.some(fromPayload(payload as Payload));
  return opt.none;
}

export default {
  intoPayload,
  fromPayload: fromRawPayload,
};
