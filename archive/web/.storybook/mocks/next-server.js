/**
 * Mock next/server for Storybook browser environment
 */

export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init);
  }
  get nextUrl() {
    return new URL(this.url);
  }
}

export class NextResponse extends Response {
  static json(body, init) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  }
  static redirect(url, status = 307) {
    return new Response(null, {
      status,
      headers: { Location: url.toString() },
    });
  }
  static next() {
    return new Response(null, { status: 200 });
  }
  static rewrite(url) {
    return new Response(null, {
      status: 200,
      headers: { "x-middleware-rewrite": url.toString() },
    });
  }
}

export function userAgent() {
  return {
    isBot: false,
    browser: { name: "Chrome", version: "120" },
    device: { type: "desktop" },
    engine: { name: "Blink" },
    os: { name: "macOS" },
    cpu: { architecture: "amd64" },
  };
}

export const cookies = () => ({
  get: () => undefined,
  set: () => {},
  delete: () => {},
  has: () => false,
  getAll: () => [],
});

export const headers = () => new Headers();
