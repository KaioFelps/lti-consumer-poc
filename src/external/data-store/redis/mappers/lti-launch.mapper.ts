import { option as opt } from "fp-ts";
import { LtiLaunchData } from "$/core/launch-data";
import { MessageRequests } from "$/core/messages";

type Payload = {
  launchId: string;
  resourceLinkId: string;
  userId: string;
  presentation?: {
    documentTarget?: string;
    width?: number;
    height?: number;
    returnUrl?: string;
    locale?: string;
  };
};

function intoPayload(launch: LtiLaunchData): Payload {
  const { documentTarget, height, locale, width, returnUrl } =
    launch.presentation ?? {};

  return {
    launchId: launch.id.toString(),
    resourceLinkId: launch.resourceLinkId.toString(),
    userId: launch.userId,
    presentation: {
      documentTarget: documentTarget?.toString(),
      height,
      locale,
      width,
      returnUrl: returnUrl?.toString(),
    },
  };
}

function fromPayload(payload: Payload): LtiLaunchData {
  let presentation: MessageRequests.Presentation | undefined;

  if (payload.presentation) {
    presentation = MessageRequests.Presentation.create({
      documentTarget: payload.presentation
        .documentTarget as MessageRequests.DocumentTarget,
      width: payload.presentation.width,
      height: payload.presentation.height,
      locale: payload.presentation.locale,
      returnUrl: payload.presentation.returnUrl
        ? new URL(payload.presentation.returnUrl)
        : undefined,
    });
  }

  return LtiLaunchData.create({
    resourceLinkId: payload.resourceLinkId,
    userId: payload.userId,
    id: payload.launchId,
    presentation,
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
