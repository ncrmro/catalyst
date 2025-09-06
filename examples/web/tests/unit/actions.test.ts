import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require auth and redirect if no session', async () => {
    const { auth } = await import('@/auth');
    const { requireAuth } = await import('@/actions');
    
    vi.mocked(auth).mockResolvedValue(null as any);

    await expect(requireAuth()).rejects.toThrow();
  });

  it('should return session if authenticated', async () => {
    const { auth } = await import('@/auth');
    const { requireAuth } = await import('@/actions');
    
    const mockSession = {
      user: { id: '1', email: 'test@example.com', admin: false }
    };
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const result = await requireAuth();
    expect(result).toEqual(mockSession);
  });
});