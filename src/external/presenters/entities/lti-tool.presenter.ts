import { LtiTool } from "@/lti/tools/entities/lti-tool.entity";
import {
  LtiToolSupportedMessagePresenter,
  PresentedLtiToolSupportedMessage,
} from "./lti-tool-supported-message.presenter";

type PresentedLtiTool = {
  id: string;
  name: string;
  description?: string;
  grantTypes: string[];
  initiateUri: string;
  homePageUri?: string;
  logoUri?: string;
  termsOfServiceUri?: string;
  policyUri?: string;
  contacts?: string[];
  registeredMessages?: PresentedLtiToolSupportedMessage[];
  requiredClaims: string[];
};

export class LtiToolPresenter {
  public static present(entity: LtiTool): PresentedLtiTool {
    const { record } = entity;
    const presentedObject = {
      id: record.id,
      name: record.name,
      description: record.ltiConfiguration.description,
      homePageUri: record.uris.homePage,
      logoUri: record.uris.logo,
      grantTypes: record.grantTypes,
      initiateUri: record.uris.initiate,
      requiredClaims: record.ltiConfiguration.claims,
      contacts: record.contacts,
      policyUri: record.uris.policy,
      registeredMessages: record.ltiConfiguration.messages.map(
        LtiToolSupportedMessagePresenter.present,
      ),
      termsOfServiceUri: record.uris.tos,
    };

    const nonUndefinedTuples = Object.entries(presentedObject).filter(
      ([_, value]) => value !== undefined,
    );

    return Object.fromEntries(nonUndefinedTuples) as PresentedLtiTool;
  }
}
