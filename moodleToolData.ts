export const moodleToolData = Object.freeze({
  /**
   * Não é necessário modificar esses valores
   */
  clientId: "019a7a34-0b63-7a27-bc3f-c46d3097668e",
  clientName: "Local Moodle",
  deployments: [
    {
      id: "3984617d-1394-43dd-8ff1-a442299ade81",
      name: "Course 1",
    },
  ],

  /**
   * Modifique esses valores de acordo com o guia no arquivo README.md
   */
  registrationUrl:
    "http://localhost/enrol/lti/register.php?token=74d7ac17852f6c54408aebe5a0740077aff9155d9b331d6248d7399c4984",
  toolUrl:
    "http://localhost/enrol/lti/launch.php?id=7eb807d9-0b1f-4e9e-964e-0754fc7700b0",
  initiateLoginUrl:
    "http://localhost/enrol/lti/login.php?id=74d7ac17852f6c54408aebe5a0740077aff9155d9b331d6248d7399c4984",
  jwksUrl: "http://localhost/enrol/lti/jwks.php",
  deepLinkingUrl: "http://localhost/enrol/lti/launch_deeplink.php",
});
