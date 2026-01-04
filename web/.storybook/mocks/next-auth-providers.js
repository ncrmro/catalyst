/**
 * Mock next-auth/providers for Storybook browser environment
 * Exports common types and utilities from the providers package
 */

// Mock Provider type - this is just for module resolution
export class Provider {
  constructor(config) {
    this.id = config?.id;
    this.name = config?.name;
    this.type = config?.type;
  }
}

export default { Provider };
