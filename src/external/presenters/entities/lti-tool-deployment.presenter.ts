import { LtiToolDeployment } from "@/lti/tools/entities/lti-tool-deployment.entity";

export type PresentedLtiToolDeployment = {
  id: string;
  toolId: string;
  label: string;
};

export class LtiToolDeploymentPresenter {
  public static present(entity: LtiToolDeployment): PresentedLtiToolDeployment {
    return {
      id: entity.getId().toString(),
      label: entity.getLabel(),
      toolId: entity.getToolId(),
    };
  }
}
