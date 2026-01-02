/**
 * VCS Provider Registry
 *
 * Manages registration and retrieval of VCS providers.
 */

import type { ProviderId, VCSProvider } from "./types";

export class ProviderRegistry {
	private providers = new Map<ProviderId, VCSProvider>();
	private defaultProviderId: ProviderId = "github";

	/**
	 * Register a VCS provider
	 */
	register(provider: VCSProvider): void {
		this.providers.set(provider.id, provider);
	}

	/**
	 * Get a provider by ID
	 */
	get(id: ProviderId): VCSProvider | undefined {
		return this.providers.get(id);
	}

	/**
	 * Get all registered providers
	 */
	getAll(): VCSProvider[] {
		return Array.from(this.providers.values());
	}

	/**
	 * Get the default provider (GitHub)
	 */
	getDefault(): VCSProvider {
		const provider = this.providers.get(this.defaultProviderId);
		if (!provider) {
			throw new Error(
				`Default provider '${this.defaultProviderId}' not registered`,
			);
		}
		return provider;
	}

	/**
	 * Set the default provider ID
	 */
	setDefault(id: ProviderId): void {
		if (!this.providers.has(id)) {
			throw new Error(`Provider '${id}' not registered`);
		}
		this.defaultProviderId = id;
	}

	/**
	 * Check if a provider is registered
	 */
	has(id: ProviderId): boolean {
		return this.providers.has(id);
	}
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
