/**
 * Mock next-auth/react for Storybook browser environment
 */

export function useSession() {
  return {
    data: {
      user: {
        id: "mock-user-id",
        name: "Mock User",
        email: "mock@example.com",
        image: null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    status: "authenticated",
  };
}

export async function signIn(provider, options) {
  console.log("signIn called with:", provider, options);
  return { ok: true, error: null };
}

export async function signOut(options) {
  console.log("signOut called with:", options);
  return { ok: true };
}

export function SessionProvider({ children }) {
  return children;
}

export default { useSession, signIn, signOut, SessionProvider };
