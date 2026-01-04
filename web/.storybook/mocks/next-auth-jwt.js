/**
 * Mock next-auth/jwt for Storybook browser environment
 */

export async function encode(params) {
  // Mock JWT encoding - just return a simple token
  return "mock-jwt-token";
}

export async function decode(params) {
  // Mock JWT decoding - return null for browser environment
  return null;
}

export async function getToken(params) {
  // Mock getToken - return mock session data
  return {
    name: "Mock User",
    email: "mock@example.com",
    sub: "mock-user-id",
  };
}

export default { encode, decode, getToken };
