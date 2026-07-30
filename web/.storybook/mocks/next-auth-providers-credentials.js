/**
 * Mock next-auth/providers/credentials for Storybook browser environment
 * This provider is server-only and cannot run in the browser
 */

// Mock Credentials provider factory
export default function Credentials(config) {
  return {
    id: config?.id || "credentials",
    name: config?.name || "Credentials",
    type: "credentials",
    credentials: config?.credentials || {},
    authorize: config?.authorize || (async () => null),
  };
}
