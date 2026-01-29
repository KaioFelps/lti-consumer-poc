import { ClassProperties } from "common/src/types/class-properties";
import { generateUUID, UUID } from "common/src/types/uuid";

type Args = Omit<ClassProperties<LtiLaunchData>, "id">;

export class LtiLaunchData {
  protected constructor(
    public readonly id: UUID,
    public readonly resourceLinkId: UUID,
    public readonly userId: string | number,
  ) {}

  public static create({ resourceLinkId, userId }: Args) {
    return new LtiLaunchData(generateUUID(), resourceLinkId, userId);
  }
}
