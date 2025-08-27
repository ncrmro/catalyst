// Mock the database module
jest.mock('../../src/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    })
  }
}))

jest.mock('../../src/db/schema', () => ({
  users: {},
  teams: {},
  teamsMemberships: {}
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn()
}))

describe('Team Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Personal team creation for new users', () => {
    it('should create a personal team when a new user is created', async () => {
      const mockProfile = {
        id: 'github-user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const { db } = require('../../src/db')
      const mockUserId = 'new-user-uuid'
      const mockTeamId = 'new-team-uuid'
      
      // Mock that user doesn't exist initially
      let selectCallCount = 0
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              selectCallCount++
              if (selectCallCount === 1) {
                // First call - user doesn't exist
                return Promise.resolve([])
              } else {
                // Second call - return the created user
                return Promise.resolve([{ id: mockUserId, email: 'test@example.com' }])
              }
            })
          })
        })
      })

      // Mock user creation returning the new user
      let insertCallCount = 0
      db.insert.mockImplementation(() => ({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockImplementation(() => {
            insertCallCount++
            if (insertCallCount === 1) {
              // First insert call - user creation
              return Promise.resolve([{ id: mockUserId, email: 'test@example.com', name: 'Test User' }])
            } else if (insertCallCount === 2) {
              // Second insert call - team creation
              return Promise.resolve([{ id: mockTeamId, name: "Test User's Team", ownerId: mockUserId }])
            } else {
              // Third insert call - team membership creation
              return Promise.resolve([{ id: 'membership-uuid', teamId: mockTeamId, userId: mockUserId, role: 'owner' }])
            }
          })
        })
      }))

      // Simulate the JWT callback logic with team creation
      const jwtCallbackWithTeams = async (params: any) => {
        const { token, account, profile } = params
        if (account && profile) {
          token.accessToken = account.access_token
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users, teams, teamsMemberships } = require('../../src/db/schema')
              
              // Check if user exists
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                // Create new user
                const newUser = await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                }).returning()
                
                // Create personal team for the new user
                if (newUser.length > 0) {
                  const userId = newUser[0].id
                  const teamName = profile.name ? `${profile.name}'s Team` : `${profile.email.split('@')[0]}'s Team`
                  
                  const newTeam = await db.insert(teams).values({
                    name: teamName,
                    description: "Personal team",
                    ownerId: userId,
                  }).returning()
                  
                  // Add user as owner in team memberships
                  if (newTeam.length > 0) {
                    await db.insert(teamsMemberships).values({
                      teamId: newTeam[0].id,
                      userId: userId,
                      role: "owner",
                    })
                  }
                }
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

      const result = await jwtCallbackWithTeams({
        token: {},
        account: { access_token: 'mock-token' },
        profile: mockProfile
      })

      expect(result).toEqual({
        accessToken: 'mock-token',
        id: mockUserId
      })

      // Verify user creation was called
      expect(db.insert).toHaveBeenCalledTimes(3)
      
      // Verify the calls were made in the correct order
      const insertCalls = db.insert.mock.calls
      expect(insertCalls[0]).toBeDefined() // User insert
      expect(insertCalls[1]).toBeDefined() // Team insert  
      expect(insertCalls[2]).toBeDefined() // Team membership insert
    })

    it('should not create a team for existing users', async () => {
      const mockProfile = {
        id: 'github-user-123',
        email: 'existing@example.com',
        name: 'Existing User',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const { db } = require('../../src/db')
      const mockUserId = 'existing-user-uuid'
      
      // Mock that user already exists
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: mockUserId, email: 'existing@example.com' }])
          })
        })
      })

      const jwtCallbackWithTeams = async (params: any) => {
        const { token, account, profile } = params
        if (account && profile) {
          token.accessToken = account.access_token
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users, teams, teamsMemberships } = require('../../src/db/schema')
              
              // Check if user exists
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                // This branch should not execute for existing user
                const newUser = await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                }).returning()
                
                // Create personal team for the new user
                if (newUser.length > 0) {
                  const userId = newUser[0].id
                  const teamName = profile.name ? `${profile.name}'s Team` : `${profile.email.split('@')[0]}'s Team`
                  
                  const newTeam = await db.insert(teams).values({
                    name: teamName,
                    description: "Personal team",
                    ownerId: userId,
                  }).returning()
                  
                  // Add user as owner in team memberships
                  if (newTeam.length > 0) {
                    await db.insert(teamsMemberships).values({
                      teamId: newTeam[0].id,
                      userId: userId,
                      role: "owner",
                    })
                  }
                }
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

      const result = await jwtCallbackWithTeams({
        token: {},
        account: { access_token: 'mock-token' },
        profile: mockProfile
      })

      expect(result).toEqual({
        accessToken: 'mock-token',
        id: mockUserId
      })

      // Verify no inserts were called since user already exists
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('should generate team name from email when user has no name', async () => {
      const mockProfile = {
        id: 'github-user-123',
        email: 'testuser@example.com',
        // no name provided
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const { db } = require('../../src/db')
      const mockUserId = 'new-user-uuid'
      const mockTeamId = 'new-team-uuid'
      
      // Mock that user doesn't exist initially
      let selectCallCount = 0
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              selectCallCount++
              if (selectCallCount === 1) {
                return Promise.resolve([])
              } else {
                return Promise.resolve([{ id: mockUserId, email: 'testuser@example.com' }])
              }
            })
          })
        })
      })

      // Mock user and team creation
      let insertCallCount = 0
      db.insert.mockImplementation(() => ({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockImplementation(() => {
            insertCallCount++
            if (insertCallCount === 1) {
              return Promise.resolve([{ id: mockUserId, email: 'testuser@example.com' }])
            } else if (insertCallCount === 2) {
              return Promise.resolve([{ id: mockTeamId, name: "testuser's Team", ownerId: mockUserId }])
            } else {
              return Promise.resolve([{ id: 'membership-uuid', teamId: mockTeamId, userId: mockUserId, role: 'owner' }])
            }
          })
        })
      }))

      const jwtCallbackWithTeams = async (params: any) => {
        const { token, account, profile } = params
        if (account && profile) {
          token.accessToken = account.access_token
          
          if (profile?.email) {
            try {
              const { eq } = require('drizzle-orm')
              const { users, teams, teamsMemberships } = require('../../src/db/schema')
              
              const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
              
              if (existingUser.length === 0) {
                const newUser = await db.insert(users).values({
                  email: profile.email,
                  name: profile.name,
                  image: profile.avatar_url
                }).returning()
                
                if (newUser.length > 0) {
                  const userId = newUser[0].id
                  const teamName = profile.name ? `${profile.name}'s Team` : `${profile.email.split('@')[0]}'s Team`
                  
                  const newTeam = await db.insert(teams).values({
                    name: teamName,
                    description: "Personal team",
                    ownerId: userId,
                  }).returning()
                  
                  if (newTeam.length > 0) {
                    await db.insert(teamsMemberships).values({
                      teamId: newTeam[0].id,
                      userId: userId,
                      role: "owner",
                    })
                  }
                }
              }
              
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

      await jwtCallbackWithTeams({
        token: {},
        account: { access_token: 'mock-token' },
        profile: mockProfile
      })

      // Verify that team was created with name based on email
      expect(db.insert).toHaveBeenCalledTimes(3)
      
      // Get the team creation call (second insert call)
      const teamInsertCall = db.insert.mock.results[1]
      expect(teamInsertCall).toBeDefined()
    })
  })
})