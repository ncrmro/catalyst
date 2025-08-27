'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { asc } from 'drizzle-orm';

/**
 * Get the first user in the system (ordered by creation/ID)
 * This user will be used for MCP API key authentication
 */
export async function getFirstUser() {
  try {
    const [firstUser] = await db
      .select()
      .from(users)
      .orderBy(asc(users.id))
      .limit(1);
    
    return firstUser || null;
  } catch (error) {
    console.error('Error fetching first user:', error);
    return null;
  }
}

/**
 * Validate an API key and return the associated user
 * For now, we use a static API key that belongs to the first user
 */
export async function validateApiKey(apiKey: string) {
  // For static API key authentication, we'll use a configured key
  const validApiKey = process.env.MCP_API_KEY;
  
  if (!validApiKey) {
    console.warn('MCP_API_KEY environment variable not set');
    return null;
  }
  
  if (apiKey !== validApiKey) {
    return null;
  }
  
  // Return the first user for this API key
  return await getFirstUser();
}