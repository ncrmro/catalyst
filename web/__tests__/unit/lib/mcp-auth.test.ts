import { describe, expect, it, beforeEach, jest } from '@jest/globals';

describe('MCP Auth - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MCP_API_KEY;
    jest.resetModules();
  });

  describe('getFirstUser', () => {
    it('should return the first user when found', async () => {
      // Mock the database at the module level
      jest.doMock('@/db', () => ({
        db: {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{
                  id: 'user-1',
                  name: 'First User',
                  email: 'first@example.com',
                  emailVerified: null,
                  image: null,
                  admin: false,
                }]),
              }),
            }),
          }),
        },
      }));
      
      jest.doMock('drizzle-orm', () => ({
        asc: jest.fn(),
      }));
      
      jest.doMock('@/db/schema', () => ({
        users: { id: 'users.id' },
      }));

      const { getFirstUser } = await import('@/lib/mcp-auth');
      const result = await getFirstUser();

      expect(result).toEqual({
        id: 'user-1',
        name: 'First User',
        email: 'first@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should return null when no users found', async () => {
      jest.doMock('@/db', () => ({
        db: {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      }));
      
      jest.doMock('drizzle-orm', () => ({
        asc: jest.fn(),
      }));
      
      jest.doMock('@/db/schema', () => ({
        users: { id: 'users.id' },
      }));

      const { getFirstUser } = await import('@/lib/mcp-auth');
      const result = await getFirstUser();

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      jest.doMock('@/db', () => ({
        db: {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          }),
        },
      }));
      
      jest.doMock('drizzle-orm', () => ({
        asc: jest.fn(),
      }));
      
      jest.doMock('@/db/schema', () => ({
        users: { id: 'users.id' },
      }));

      const { getFirstUser } = await import('@/lib/mcp-auth');
      const result = await getFirstUser();

      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return null when MCP_API_KEY is not set', async () => {
      jest.doMock('@/db', () => ({
        db: {},
      }));
      
      const { validateApiKey } = await import('@/lib/mcp-auth');
      const result = await validateApiKey('any-key');

      expect(result).toBeNull();
    });

    it('should return null when API key does not match', async () => {
      process.env.MCP_API_KEY = 'correct-key';
      
      jest.doMock('@/db', () => ({
        db: {},
      }));

      const { validateApiKey } = await import('@/lib/mcp-auth');
      const result = await validateApiKey('wrong-key');

      expect(result).toBeNull();
    });

    it('should return first user when API key matches', async () => {
      process.env.MCP_API_KEY = 'correct-key';
      
      jest.doMock('@/db', () => ({
        db: {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{
                  id: 'user-1',
                  name: 'First User',
                  email: 'first@example.com',
                  emailVerified: null,
                  image: null,
                  admin: false,
                }]),
              }),
            }),
          }),
        },
      }));
      
      jest.doMock('drizzle-orm', () => ({
        asc: jest.fn(),
      }));
      
      jest.doMock('@/db/schema', () => ({
        users: { id: 'users.id' },
      }));

      const { validateApiKey } = await import('@/lib/mcp-auth');
      const result = await validateApiKey('correct-key');

      expect(result).toEqual({
        id: 'user-1',
        name: 'First User',
        email: 'first@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      });
    });

    it('should return null when first user is not found', async () => {
      process.env.MCP_API_KEY = 'correct-key';
      
      jest.doMock('@/db', () => ({
        db: {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      }));
      
      jest.doMock('drizzle-orm', () => ({
        asc: jest.fn(),
      }));
      
      jest.doMock('@/db/schema', () => ({
        users: { id: 'users.id' },
      }));

      const { validateApiKey } = await import('@/lib/mcp-auth');
      const result = await validateApiKey('correct-key');

      expect(result).toBeNull();
    });
  });
});