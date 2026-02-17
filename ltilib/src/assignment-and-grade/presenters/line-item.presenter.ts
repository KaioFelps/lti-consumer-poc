import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";
import { Platform } from "$/core/platform";
import { MissingPlatformAgsConfiguration } from "../errors/missing-platform-ags-configuration.error";
import { LtiLineItem } from "../line-item";

export type PresentedLtiLineItem = {
  id: string;
  label: string;
  scoreMaximum: number;
  resourceLinkId?: string;
  resourceId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
  gradesReleased?: boolean;
};

export function presentLtiLineItem(
  lineitem: LtiLineItem,
  platform: Platform,
): Either<MisconfiguredPlatformError, PresentedLtiLineItem> {
  if (!platform.agsConfiguration) {
    return either.left(new MissingPlatformAgsConfiguration());
  }

  const presentedLineItem = {
    id: platform.agsConfiguration.lineItemsEndpoint(lineitem.id).toString(),
    label: lineitem.label,
    tag: lineitem.tag,
    scoreMaximum: lineitem.scoreMaximum,
    gradesReleased: lineitem.gradesReleased,
    resourceId: lineitem.resource?.externalToolResourceId,
    resourceLinkId: lineitem.resourceLink?.id,
    startDateTime: lineitem.startDateTime?.toISOString(),
    endDateTime: lineitem.endDateTime?.toISOString(),
  } satisfies PresentedLtiLineItem;

  return either.right(presentedLineItem);
}
