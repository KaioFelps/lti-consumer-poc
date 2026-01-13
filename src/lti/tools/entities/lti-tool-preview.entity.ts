import { EntityBase } from "@/core/entity-base";

type LtiToolPreviewProps = {
  id: string;
  name: string;
  logoUri?: string;
  homePageUri?: string;
  description?: string;
};

/**
 * A readonly preview of a LtiTool
 */
export class LtiToolPreview extends EntityBase<LtiToolPreviewProps> {
  private constructor(props: LtiToolPreviewProps) {
    super(props);
  }

  public static createUnchecked(props: LtiToolPreviewProps) {
    return new LtiToolPreview(props);
  }

  public getId() {
    return this.props.id;
  }

  public getName() {
    return this.props.name;
  }

  public getLogoUri() {
    return this.props.logoUri;
  }

  public getHomePageUri() {
    return this.props.homePageUri;
  }

  public getDescription() {
    return this.props.description;
  }
}
