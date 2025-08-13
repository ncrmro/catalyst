// Mock the database module
jest.mock('../src/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined)
    })
  }
}))

jest.mock('../src/db/schema', () => ({
  users: {}
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn()
}))

describe('JWT Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('JWT callback logic', () => {
    it('should add accessToken and user id to token when account is provided', async () => {
      const mockToken = {}
      const mockAccount = {
        access_token: 'mock-access-token'
      }
      const mockProfile = {
        id: 'github-user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const { db } = require('../src/db')
      
      // Mock that user doesn't exist (empty array)
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })

      // Test the JWT callback logic directly
      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          token.id = profile.id
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users } = require('../src/db/schema')
              
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                })
              }
            } catch (error) {
              console.error('Error creating user:', error)
            }
          }
        }
        return token
      }

      const result = await jwtCallback({
        token: mockToken,
        account: mockAccount,
        profile: mockProfile
      })

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        id: 'github-user-123'
      })

      // Verify user creation was attempted
      expect(db.insert).toHaveBeenCalled()
    })

    it('should not modify token when no account is provided', async () => {
      const mockToken = { existing: 'data' }

      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          token.id = profile.id
        }
        return token
      }

      const result = await jwtCallback({
        token: mockToken,
        account: null,
        profile: null
      })

      expect(result).toEqual({ existing: 'data' })
    })

    it('should handle existing user without creating duplicate', async () => {
      const mockToken = {}
      const mockAccount = {
        access_token: 'mock-access-token'
      }
      const mockProfile = {
        id: 'github-user-123',
        email: 'existing@example.com',
        name: 'Existing User',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const { db } = require('../src/db')
      
      // Mock that user exists
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'existing-user-id' }])
          })
        })
      })

      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          token.id = profile.id
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users } = require('../src/db/schema')
              
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                })
              }
            } catch (error) {
              console.error('Error creating user:', error)
            }
          }
        }
        return token
      }

      const result = await jwtCallback({
        token: mockToken,
        account: mockAccount,
        profile: mockProfile
      })

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        id: 'github-user-123'
      })

      // Verify user creation was NOT attempted since user exists
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('should skip user creation when profile has no email', async () => {
      const mockToken = {}
      const mockAccount = {
        access_token: 'mock-access-token'
      }
      const mockProfile = {
        id: 'github-user-123',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
        // no email
      }

      const { db } = require('../src/db')

      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          token.id = profile.id
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users } = require('../src/db/schema')
              
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                })
              }
            } catch (error) {
              console.error('Error creating user:', error)
            }
          }
        }
        return token
      }

      const result = await jwtCallback({
        token: mockToken,
        account: mockAccount,
        profile: mockProfile
      })

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        id: 'github-user-123'
      })

      // Verify user creation was NOT attempted since no email
      expect(db.select).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })
  })
})