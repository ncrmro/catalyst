import { auth } from "@/auth";

/**
 * Check if the current user is an admin
 * @returns Promise<boolean> - true if the user is an admin, false otherwise
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.admin === true;
}

/**
 * Require admin access - throws error if user is not admin
 * @throws {Error} If user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  
  if (!session.user.admin) {
    throw new Error("Admin access required");
  }
}