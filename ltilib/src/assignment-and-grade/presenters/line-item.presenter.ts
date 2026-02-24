import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { Context } from "$/core/context";
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
  startDateTime?: string | null | "";
  endDateTime?: string | null | "";
  gradesReleased?: boolean;
};

export function presentLtiLineItem(
  lineitem: LtiLineItem,
  context: Context,
  platform: Platform,
): Either<MisconfiguredPlatformError, PresentedLtiLineItem> {
  if (!platform.agsConfiguration) {
    return either.left(new MissingPlatformAgsConfiguration());
  }

  const resolvedStartDateTime = platform.agsConfiguration.deadlinesEnabled.start
    ? (lineitem.startDateTime?.toISOString() ?? null)
    : undefined;

  const resolvedEndDateTime = platform.agsConfiguration.deadlinesEnabled.end
    ? (lineitem.endDateTime?.toISOString() ?? null)
    : undefined;

  const presentedLineItem = {
    id: platform.agsConfiguration.lineItemsEndpoint(context, lineitem.id).toString(),
    label: lineitem.label,
    tag: lineitem.tag,
    scoreMaximum: lineitem.scoreMaximum,
    gradesReleased: lineitem.gradesReleased,
    resourceId: lineitem.externalResource?.externalToolResourceId,
    resourceLinkId: lineitem.resourceLink?.id,
    startDateTime: resolvedStartDateTime,
    endDateTime: resolvedEndDateTime,
  } satisfies PresentedLtiLineItem;

  return either.right(presentedLineItem);
}
