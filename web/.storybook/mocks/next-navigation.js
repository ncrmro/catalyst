/**
 * Mock for next/navigation (App Router)
 * This provides stub implementations for components using useRouter from next/navigation
 */

// Create a mock router that doesn't require App Router context
const mockRouter = {
  push: (url) => {
    console.log("router.push called with:", url);
    return Promise.resolve(true);
  },
  replace: (url) => {
    console.log("router.replace called with:", url);
    return Promise.resolve(true);
  },
  refresh: () => {
    console.log("router.refresh called");
  },
  back: () => {
    console.log("router.back called");
  },
  forward: () => {
    console.log("router.forward called");
  },
  prefetch: (url) => {
    console.log("router.prefetch called with:", url);
    return Promise.resolve();
  },
};

// Mock useRouter that returns our mock router directly
export function useRouter() {
  return mockRouter;
}

// Mock usePathname
export function usePathname() {
  return "/";
}

// Mock useSearchParams
export function useSearchParams() {
  return new URLSearchParams();
}

// Mock useParams
export function useParams() {
  return {};
}

// Mock useSelectedLayoutSegment
export function useSelectedLayoutSegment() {
  return null;
}

// Mock useSelectedLayoutSegments
export function useSelectedLayoutSegments() {
  return [];
}

// Mock redirect
export function redirect(url) {
  console.log("redirect called with:", url);
  throw new Error(`NEXT_REDIRECT: ${url}`);
}

// Mock permanentRedirect
export function permanentRedirect(url) {
  console.log("permanentRedirect called with:", url);
  throw new Error(`NEXT_REDIRECT: ${url}`);
}

// Mock notFound
export function notFound() {
  console.log("notFound called");
  throw new Error("NEXT_NOT_FOUND");
}

// Mock useServerInsertedHTML (no-op in client)
export function useServerInsertedHTML() {
  return () => {};
}

// Re-export RedirectType enum
export const RedirectType = {
  push: "push",
  replace: "replace",
};
