/**
 * Mock next-auth for Storybook browser environment
 */

export function auth() {
  return Promise.resolve({
    user: {
      id: "mock-user-id",
      name: "Mock User",
      email: "mock@example.com",
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

export const handlers = {
  GET: async () => new Response(JSON.stringify({}), { status: 200 }),
  POST: async () => new Response(JSON.stringify({}), { status: 200 }),
};

export const signIn = async () => ({ ok: true, error: null });
export const signOut = async () => ({ ok: true });

export default { auth, handlers, signIn, signOut };
