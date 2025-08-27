import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { validateApiKey, getFirstUser } from '@/lib/mcp-auth';

// Mock the database
jest.mock('@/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

const mockDb = jest.mocked(require('@/db').db);

describe('MCP Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MCP_API_KEY;
  });

  describe('getFirstUser', () => {
    it('should return the first user when found', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'First User',
        email: 'first@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      // Mock the database chain
      mockDb.select.mockResolvedValue([mockUser]);

      const result = await getFirstUser();

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when no users found', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await getFirstUser();

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockDb.select.mockRejectedValue(new Error('Database error'));

      const result = await getFirstUser();

      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return null when MCP_API_KEY is not set', async () => {
      const result = await validateApiKey('any-key');

      expect(result).toBeNull();
    });

    it('should return null when API key does not match', async () => {
      process.env.MCP_API_KEY = 'correct-key';

      const result = await validateApiKey('wrong-key');

      expect(result).toBeNull();
    });

    it('should return first user when API key matches', async () => {
      process.env.MCP_API_KEY = 'correct-key';
      
      const mockUser = {
        id: 'user-1',
        name: 'First User',
        email: 'first@example.com',
        emailVerified: null,
        image: null,
        admin: false,
      };

      mockDb.select.mockResolvedValue([mockUser]);

      const result = await validateApiKey('correct-key');

      expect(result).toEqual(mockUser);
    });

    it('should return null when first user is not found', async () => {
      process.env.MCP_API_KEY = 'correct-key';
      mockDb.select.mockResolvedValue([]);

      const result = await validateApiKey('correct-key');

      expect(result).toBeNull();
    });
  });
});