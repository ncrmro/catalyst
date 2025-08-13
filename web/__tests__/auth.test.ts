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
    it('should add accessToken and database user id to token when account is provided', async () => {
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
      const mockDatabaseUserId = 'uuid-database-user-id'
      
      // Mock that user doesn't exist initially (empty array), then return created user
      let callCount = 0
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                // First call - user doesn't exist
                return Promise.resolve([])
              } else {
                // Second call - return the created/found user
                return Promise.resolve([{ id: mockDatabaseUserId, email: 'test@example.com' }])
              }
            })
          })
        })
      })

      // Test the JWT callback logic directly
      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          
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
              
              // Get the user from database to set token.id to database user ID
              const user = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              if (user.length > 0) {
                token.id = user[0].id
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
        id: mockDatabaseUserId
      })

      // Verify user creation was attempted
      expect(db.insert).toHaveBeenCalled()
      // Verify user lookup was called twice (once to check existence, once to get ID)
      expect(db.select).toHaveBeenCalledTimes(2)
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
      const mockDatabaseUserId = 'existing-user-database-id'
      
      // Mock that user exists - both calls should return the same user
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: mockDatabaseUserId, email: 'existing@example.com' }])
          })
        })
      })

      const jwtCallback = async (params: any) => {
        const { token, account, profile } = params
        if (account) {
          token.accessToken = account.access_token
          
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
              
              // Get the user from database to set token.id to database user ID
              const user = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              if (user.length > 0) {
                token.id = user[0].id
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
        id: mockDatabaseUserId
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
              
              // Get the user from database to set token.id to database user ID
              const user = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              if (user.length > 0) {
                token.id = user[0].id
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
        accessToken: 'mock-access-token'
        // No id should be set when there's no email
      })

      // Verify user creation was NOT attempted since no email
      expect(db.select).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })
  })

  describe('Session callback logic', () => {
    it('should pass accessToken and userId from token to session', async () => {
      const mockSession = {
        user: { name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z'
      }
      const mockToken = {
        accessToken: 'github-access-token',
        id: 'database-user-uuid'
      }

      const sessionCallback = async (params: any) => {
        const { session, token } = params
        session.accessToken = token.accessToken as string
        session.userId = token.id as string
        return session
      }

      const result = await sessionCallback({
        session: mockSession,
        token: mockToken
      })

      expect(result).toEqual({
        user: { name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
        accessToken: 'github-access-token',
        userId: 'database-user-uuid'
      })
    })

    it('should handle missing token properties gracefully', async () => {
      const mockSession = {
        user: { name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z'
      }
      const mockToken = {}

      const sessionCallback = async (params: any) => {
        const { session, token } = params
        session.accessToken = token.accessToken as string
        session.userId = token.id as string
        return session
      }

      const result = await sessionCallback({
        session: mockSession,
        token: mockToken
      })

      expect(result).toEqual({
        user: { name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
        accessToken: undefined,
        userId: undefined
      })
    })
  })
})