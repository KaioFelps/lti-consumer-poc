/**
 * A registry of all routes available for sending to views.
 */
export const Routes = {
  home: () => `/`,
  oidc: {
    interaction: (interactionId: string) =>
      `/oidc/interaction/${interactionId}`,
    login: (interactionId: string) =>
      `/oidc/interaction/${interactionId}/login`,
    consent: (interactionId: string) =>
      `/oidc/interaction/${interactionId}/consent`,
    abort: (interactionId: string) =>
      `/oidc/interaction/${interactionId}/abort`,
    logout: () => `/oidc/session/end`,
  },
  auth: {
    loginForm: () => `/auth/login`,
    login: () => `/auth/login`,
    registerForm: () => `/auth/register`,
    register: () => `/auth/register`,
    logout: () => `/auth/logout`,
    oidcLogout: () => Routes.oidc.logout(),
  },
  lti: {
    tools: {
      registerForm: () => `/lti/tools/register`,
      register: () => `/lti/tools/register`,
      list: () => `/lti/tools`,
      details: (toolId: string) => `/lti/tools/${toolId}/details`,
    },
    deployments: {
      deploy: (toolId: string) => `/lti/deployments/${toolId}/deploy`,
      delete: (deploymentId: string) =>
        `/lti/deployments/${deploymentId}/delete`,
    },
  },
} as const;
