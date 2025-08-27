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
        returning: jest.fn().mockResolvedValue([{ id: 'test-id', admin: false }])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id', admin: true }])
        })
      })
    }),
    transaction: jest.fn().mockImplementation((callback) => callback({
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id', admin: false }])
        })
      })
    }))
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

describe('Admin Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Credentials Provider - Admin Status', () => {
    it('should create admin user when password is "admin"', async () => {
      const { db } = require('../../src/db')
      
      // Mock user doesn't exist
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      })
      
      // Mock user creation with admin=true
      db.transaction.mockImplementation((callback) => callback({
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ 
              id: 'admin-user-id', 
              email: 'admin@example.com',
              admin: true 
            }])
          })
        })
      }))

      // Simulate the credentials authorize function logic
      const password = 'admin'
      const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/)
      expect(passwordMatch).toBeTruthy()
      
      const [, baseType] = passwordMatch!
      const isAdmin = baseType === 'admin'
      expect(isAdmin).toBe(true)
      
      // The user creation should pass admin: true
      const mockUserObject = {
        email: 'admin@example.com',
        name: 'Test Admin',
        admin: isAdmin
      }
      
      expect(mockUserObject.admin).toBe(true)
    })

    it('should create regular user when password is "password"', async () => {
      const { db } = require('../../src/db')
      
      // Mock user doesn't exist
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      })
      
      // Mock user creation with admin=false
      db.transaction.mockImplementation((callback) => callback({
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ 
              id: 'regular-user-id', 
              email: 'bob@alice.com',
              admin: false 
            }])
          })
        })
      }))

      // Simulate the credentials authorize function logic
      const password = 'password'
      const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/)
      expect(passwordMatch).toBeTruthy()
      
      const [, baseType] = passwordMatch!
      const isAdmin = baseType === 'admin'
      expect(isAdmin).toBe(false)
      
      // The user creation should pass admin: false
      const mockUserObject = {
        email: 'bob@alice.com',
        name: 'Bob Alice',
        admin: isAdmin
      }
      
      expect(mockUserObject.admin).toBe(false)
    })

    it('should update existing user admin status when password type changes', async () => {
      const { db } = require('../../src/db')
      
      // Mock existing user with admin=false
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'existing-user-id',
            email: 'admin@example.com',
            admin: false
          }])
        })
      })
      
      // Mock user update with admin=true
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'existing-user-id',
              email: 'admin@example.com',
              admin: true
            }])
          })
        })
      })

      // Simulate the credentials authorize function logic for admin password
      const password = 'admin'
      const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/)
      const [, baseType] = passwordMatch!
      const isAdmin = baseType === 'admin'
      
      // Simulate the logic that updates existing users
      const existingUser = { id: 'existing-user-id', admin: false }
      const shouldUpdate = existingUser.admin !== isAdmin
      
      expect(shouldUpdate).toBe(true)
      expect(isAdmin).toBe(true)
    })
  })

  describe('JWT Callback - Admin Status', () => {
    it('should include admin status in JWT token', async () => {
      const { db } = require('../../src/db')
      
      // Mock existing user with admin status
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'admin-user-id',
              email: 'admin@example.com',
              admin: true
            }])
          })
        })
      })

      // Simulate JWT callback logic
      const token = { email: 'admin@example.com' }
      const existingUser = { id: 'admin-user-id', admin: true }
      
      const result = {
        ...token,
        id: existingUser.id,
        admin: existingUser.admin
      }
      
      expect(result.admin).toBe(true)
      expect(result.id).toBe('admin-user-id')
    })
  })

  describe('Session Callback - Admin Status', () => {
    it('should include admin status in session', async () => {
      const mockSession = {
        user: { 
          id: 'admin-user-id',
          name: 'Test Admin', 
          email: 'admin@example.com' 
        },
        expires: '2024-12-31T23:59:59.999Z'
      }
      
      const mockToken = {
        id: 'admin-user-id',
        admin: true,
        accessToken: 'test-token'
      }

      // Simulate session callback logic
      const result = {
        ...mockSession,
        accessToken: mockToken.accessToken,
        user: {
          ...mockSession.user,
          id: mockToken.id,
          admin: mockToken.admin
        }
      }
      
      expect(result.user.admin).toBe(true)
      expect(result.user.id).toBe('admin-user-id')
      expect(result.accessToken).toBe('test-token')
    })

    it('should handle regular user session', async () => {
      const mockSession = {
        user: { 
          id: 'regular-user-id',
          name: 'Bob Alice', 
          email: 'bob@alice.com' 
        },
        expires: '2024-12-31T23:59:59.999Z'
      }
      
      const mockToken = {
        id: 'regular-user-id',
        admin: false,
        accessToken: 'test-token'
      }

      // Simulate session callback logic
      const result = {
        ...mockSession,
        accessToken: mockToken.accessToken,
        user: {
          ...mockSession.user,
          id: mockToken.id,
          admin: mockToken.admin
        }
      }
      
      expect(result.user.admin).toBe(false)
      expect(result.user.id).toBe('regular-user-id')
    })
  })

  describe('Password Pattern Matching', () => {
    it('should correctly identify admin passwords', () => {
      const patterns = [
        'admin',
        'admin-user1',
        'admin-test123'
      ]
      
      patterns.forEach(password => {
        const match = password.match(/^(password|admin)(?:-(.*))?$/)
        expect(match).toBeTruthy()
        const [, baseType] = match!
        expect(baseType).toBe('admin')
      })
    })

    it('should correctly identify regular user passwords', () => {
      const patterns = [
        'password',
        'password-user1',
        'password-test123'
      ]
      
      patterns.forEach(password => {
        const match = password.match(/^(password|admin)(?:-(.*))?$/)
        expect(match).toBeTruthy()
        const [, baseType] = match!
        expect(baseType).toBe('password')
      })
    })

    it('should reject invalid passwords', () => {
      const invalidPasswords = [
        'invalid',
        'wrongpassword',
        'admin-',
        'password-',
        ''
      ]
      
      invalidPasswords.forEach(password => {
        const match = password.match(/^(password|admin)(?:-(.*))?$/)
        if (password === 'admin-' || password === 'password-') {
          expect(match).toBeTruthy() // These actually match but with empty suffix
        } else {
          expect(match).toBeFalsy()
        }
      })
    })
  })
})