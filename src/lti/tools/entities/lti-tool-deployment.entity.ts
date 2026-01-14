import { Optional } from "common/src/types/optional";
import { generateUUID, UUID } from "common/src/types/uuid";
import { EntityBase } from "@/core/entity-base";

export type LtiToolDeploymentProps = {
  id: UUID;
  toolId: string;
  label: string;
};

export class LtiToolDeployment extends EntityBase<LtiToolDeploymentProps> {
  private constructor(props: LtiToolDeploymentProps) {
    super(props);
  }

  public static create({
    id = generateUUID(),
    ...props
  }: Optional<LtiToolDeploymentProps, "id">) {
    return new LtiToolDeployment({ id, ...props });
  }

  public getId() {
    return this.props.id;
  }

  public getToolId() {
    return this.props.toolId;
  }

  public getLabel() {
    return this.props.label;
  }
}
