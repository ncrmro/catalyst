'use server';

import { getAllInstallations } from '@/lib/github';

/**
 * Server action to fetch GitHub App installations
 * Filters out installations with null accounts for safety
 */
export async function getGitHubAppInstallations() {
  try {
    const installations = await getAllInstallations();
    // Filter out any installations with null accounts for safety
    return installations.filter(installation => installation.account !== null);
  } catch (error) {
    console.error('Error fetching installations:', error);
    return [];
  }
}