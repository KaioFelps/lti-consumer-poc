export class ToolRegistration {
  private clientSecret?: string;
  private jwksURI?: string;
  private initiateLink: string;
  private name: string;
  private launchUrl: string;
}

//   jwks_uri: moodleToolData.jwksUrl,
//   client_id: moodleToolData.clientId,
//   initiate_login_uri: moodleToolData.initiateLoginUrl,
//   client_name: moodleToolData.clientName,
//   application_type: "web",
//   redirect_uris: [moodleToolData.toolUrl],
