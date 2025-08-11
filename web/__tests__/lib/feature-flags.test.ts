import { FF, isFeatureEnabled, useFeatureFlags } from '../../src/lib/feature-flags';

// Mock process.env for testing
const originalEnv = process.env;

describe('Feature Flags', () => {
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseFeatureFlags', () => {
    it('should parse FF_ prefixed environment variables', () => {
      // Set test environment variables
      process.env.FF_USER_CLUSTERS = '1';
      process.env.FF_ADVANCED_FEATURES = '0';
      process.env.FF_BETA_MODE = '1';
      process.env.NOT_FF_VARIABLE = '1';
      
      // Re-import to get fresh instance with new env vars
      const { FF: freshFF } = require('../../src/lib/feature-flags');
      
      expect(freshFF.USER_CLUSTERS).toBe(true);
      expect(freshFF.ADVANCED_FEATURES).toBe(false);
      expect(freshFF.BETA_MODE).toBe(true);
      expect(freshFF.NOT_FF_VARIABLE).toBeUndefined();
    });

    it('should handle empty environment', () => {
      // Clear all FF_ variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('FF_')) {
          delete process.env[key];
        }
      });
      
      const { FF: freshFF } = require('../../src/lib/feature-flags');
      
      expect(Object.keys(freshFF)).toHaveLength(0);
    });

    it('should only treat "1" as true', () => {
      process.env.FF_TEST_TRUE = '1';
      process.env.FF_TEST_FALSE = '0';
      process.env.FF_TEST_EMPTY = '';
      process.env.FF_TEST_STRING = 'true';
      process.env.FF_TEST_NUMBER = '2';
      
      const { FF: freshFF } = require('../../src/lib/feature-flags');
      
      expect(freshFF.TEST_TRUE).toBe(true);
      expect(freshFF.TEST_FALSE).toBe(false);
      expect(freshFF.TEST_EMPTY).toBe(false);
      expect(freshFF.TEST_STRING).toBe(false);
      expect(freshFF.TEST_NUMBER).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', () => {
      process.env.FF_ENABLED_FEATURE = '1';
      
      const { isFeatureEnabled: freshIsFeatureEnabled } = require('../../src/lib/feature-flags');
      
      expect(freshIsFeatureEnabled('ENABLED_FEATURE')).toBe(true);
    });

    it('should return false for disabled features', () => {
      process.env.FF_DISABLED_FEATURE = '0';
      
      const { isFeatureEnabled: freshIsFeatureEnabled } = require('../../src/lib/feature-flags');
      
      expect(freshIsFeatureEnabled('DISABLED_FEATURE')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      const { isFeatureEnabled: freshIsFeatureEnabled } = require('../../src/lib/feature-flags');
      
      expect(freshIsFeatureEnabled('NON_EXISTENT')).toBe(false);
    });
  });

  describe('useFeatureFlags hook', () => {
    it('should return the FF object', () => {
      process.env.FF_HOOK_TEST = '1';
      
      const { useFeatureFlags: freshUseFeatureFlags, FF: freshFF } = require('../../src/lib/feature-flags');
      
      const flags = freshUseFeatureFlags();
      expect(flags).toBe(freshFF);
      expect(flags.HOOK_TEST).toBe(true);
    });
  });
});