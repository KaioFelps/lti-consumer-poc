import { LtiToolPreview } from "@/lti/tools/entities/lti-tool-preview.entity";

type PresentedLtiToolPreview = {
  id: string;
  name: string;
  logoUri?: string;
  homePageUri?: string;
  description?: string;
};

export class LtiToolPreviewPresenter {
  public static present(entity: LtiToolPreview): PresentedLtiToolPreview {
    return {
      id: entity.getId(),
      name: entity.getName(),
      description: entity.getDescription(),
      homePageUri: entity.getHomePageUri(),
      logoUri: entity.getLogoUri(),
    };
  }
}
