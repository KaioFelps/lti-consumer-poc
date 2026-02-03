/**
 * A registry of all routes available for sending to views and/or general usage across
 * the application.
 *
 * Every path must be absolute.
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
    auth: () => `/oidc/auth`,
    jwks: () => `/oidc/jwks`,
    registration: () => `/oidc/reg`,
    token: () => `/oidc/token`,
    pushedAuthorizationRequest: () => `/oidc/request`,
    userInfo: () => `/oidc/me`,
    openIdConfiguration: () => `/oidc/.well-known/openid-configuration`,
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
    openIdConfiguration: () => `/lti/.well-known/openid-configuration`,
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
    resourceLinks: {
      list: (deploymentId?: string) =>
        deploymentId
          ? `/lti/resource-links?deploymentId=${deploymentId}`
          : `/lti/resource-links`,
      create: () => `/lti/resource-links/create`,
      delete: (resourceLinkId: string) =>
        `/lti/resource-links/${resourceLinkId}`,
    },
    launch: {
      initiate: (resourceLinkId: string) =>
        `/lti/launches/${resourceLinkId}/initiate`,
      login: () => `/lti/launches/login`,
      return: () => `/lti/launches/post-launch`,
    },
  },
} as const;
