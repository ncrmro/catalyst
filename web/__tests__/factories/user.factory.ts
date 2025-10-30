/**
 * Factory for creating test user data.
 *
 * @example
 * ```typescript
 * // Build in-memory object
 * const user = userFactory.build();
 *
 * // Build with overrides
 * const adminUser = userFactory.build({
 *   name: 'John Admin',
 *   email: 'admin@example.com',
 *   admin: true,
 * });
 *
 * // Use traits
 * const admin = userFactory.admin().build();
 * const regularUser = userFactory.regularUser().build();
 *
 * // Persist to database
 * const persistedUser = await userFactory.create();
 *
 * // Build multiple
 * const users = userFactory.buildList(5);
 * ```
 */

import { Factory, faker, db } from '@/lib/factories';
import { users } from '@/db/schema';
import type { InferInsertModel } from 'drizzle-orm';

type InsertUser = InferInsertModel<typeof users>;

/**
 * User factory with trait methods for common user types.
 */
class UserFactory extends Factory<InsertUser> {
  /**
   * Create an admin user
   */
  admin() {
    return this.params({ admin: true });
  }

  /**
   * Create a regular (non-admin) user
   */
  regularUser() {
    return this.params({ admin: false });
  }

  /**
   * Create a user with onboarding completed
   */
  onboarded() {
    return this.params({ onboardingCompleted: true });
  }

  /**
   * Create and persist a user to the database.
   */
  async create(params?: Partial<InsertUser>) {
    const user = this.build(params);
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  /**
   * Create and persist multiple users to the database.
   */
  async createList(count: number, params?: Partial<InsertUser>) {
    const userList = this.buildList(count, params);
    return await db.insert(users).values(userList).returning();
  }
}

export const userFactory = UserFactory.define(() => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  emailVerified: null,
  image: null,
  admin: false,
  onboardingCompleted: false,
  onboardingData: null,
}));
