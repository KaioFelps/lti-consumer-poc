import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity";
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
      description: record.description,
      homePageUri: record.homePageUrl?.toString(),
      logoUri: record.logoUrl?.toString(),
      grantTypes: record.grantTypes,
      initiateUri: record.initiateUrl.toString(),
      requiredClaims: record.claims,
      contacts: record.contacts,
      policyUri: record.policyUrl?.toString(),
      registeredMessages: record.messages.map(LtiToolSupportedMessagePresenter.present),
      termsOfServiceUri: record.termsOfServiceUrl?.toString(),
      redirectUris: record.redirectUrls,
    };

    const nonUndefinedTuples = Object.entries(presentedObject).filter(
      ([_, value]) => value !== undefined,
    );

    return Object.fromEntries(nonUndefinedTuples) as PresentedLtiTool;
  }
}
