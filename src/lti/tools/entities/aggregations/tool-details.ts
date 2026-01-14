import { LtiTool } from "../lti-tool.entity";
import { LtiToolDeployment } from "../lti-tool-deployment.entity";

type ToolDetailsProps = {
  readonly tool: LtiTool;
  readonly deployments: LtiToolDeployment[];
};

export class LtiToolDetails {
  private props: ToolDetailsProps;

  private constructor(props: ToolDetailsProps) {
    this.props = props;
  }

  public static create(props: ToolDetailsProps) {
    return new LtiToolDetails(props);
  }

  public getTool(): LtiTool {
    return this.props.tool;
  }

  public getDeployments(): LtiToolDeployment[] {
    return this.props.deployments;
  }
}
