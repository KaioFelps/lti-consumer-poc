import { ClassProperties } from "common/src/types/class-properties";
import { Optional } from "common/src/types/optional";
import { generateUUID, UUID } from "common/src/types/uuid";
import { MessageRequests } from "./messages";

type Args = Optional<ClassProperties<LtiLaunchData>, "id">;

export class LtiLaunchData {
  protected constructor(
    public readonly id: UUID,
    public readonly resourceLinkId: UUID,
    public readonly userId: string,
    public readonly presentation?: MessageRequests.Presentation,
  ) {}

  public static create({
    resourceLinkId,
    userId,
    presentation,
    id = generateUUID(),
  }: Args) {
    return new LtiLaunchData(id, resourceLinkId, userId, presentation);
  }
}
