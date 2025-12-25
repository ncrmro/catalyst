import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

export const providers = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (credentials) => {
      // Relaxed schema: email is optional (for dev mode password-only login)
      const parsedCredentials = z
        .object({
          email: z.string().optional(),
          password: z.string().min(1), // Allow shorter passwords for dev convenience? Spec says "admin" or "password"
        })
        .safeParse(credentials);

      if (parsedCredentials.success) {
        const { email, password } = parsedCredentials.data;
        const isDev = process.env.NODE_ENV === 'development';

        // Development Logic
        if (isDev) {
          if (password === 'admin') {
            // Return admin user (config.ts will create if missing)
            return {
              id: 'admin-dev-id',
              name: 'Admin User',
              email: 'admin@example.com',
              admin: true,
            };
          }
          if (password === 'password') {
            // Return regular user (config.ts will create if missing)
            return {
              id: 'user-dev-id',
              name: 'Regular User',
              email: 'user@example.com',
              admin: false,
            };
          }

          // If email is provided in dev (via fallback), verify it matches
          if (email === 'admin@example.com' && password === 'admin') {
            return {
              id: 'admin-dev-id',
              name: 'Admin User',
              email: 'admin@example.com',
              admin: true,
            };
          }
        }

        // Production / Standard Logic (Requires Email)
        if (email && password) {
          // TODO: Implement actual database lookup and password verification here
          // For now, allow the specific test user
          if (email === 'user@example.com' && password === 'password') {
            return {
              id: 'user-dev-id',
              name: 'Regular User',
              email: 'user@example.com',
              admin: false,
            };
          }
        }
      }

      return null;
    },
  }),
];
