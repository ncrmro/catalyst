/**
 * Mock next-auth/providers/github for Storybook browser environment
 * This provider is server-only and cannot run in the browser
 */

// Mock GitHub provider factory
export default function GitHub(config) {
  return {
    id: config?.id || "github",
    name: config?.name || "GitHub",
    type: "oauth",
    authorization: config?.authorization,
    clientId: config?.clientId,
    clientSecret: config?.clientSecret,
  };
}
