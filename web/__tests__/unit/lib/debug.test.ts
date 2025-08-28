import { debug, isDebugLoggingEnabled } from '../../../src/lib/debug';

describe('Debug logging utility', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Spy on console.debug
    consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment after each test
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  describe('in test environment (default)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      delete process.env.DEBUG;
    });

    it('should not output debug logs by default', () => {
      debug('Test debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should indicate debug logging is disabled', () => {
      const { isDebugLoggingEnabled: freshIsDebugEnabled } = require('../../../src/lib/debug');
      expect(freshIsDebugEnabled()).toBe(false);
    });
  });

  describe('in development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.DEBUG;
    });

    it('should output debug logs in development', () => {
      // Need to re-import to pick up new environment
      const { debug: freshDebug } = require('../../../src/lib/debug');
      
      freshDebug('Development debug message');
      expect(consoleSpy).toHaveBeenCalledWith('Development debug message');
    });

    it('should indicate debug logging is enabled', () => {
      const { isDebugLoggingEnabled: freshIsDebugEnabled } = require('../../../src/lib/debug');
      expect(freshIsDebugEnabled()).toBe(true);
    });
  });

  describe('with DEBUG environment variable', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = '1';
    });

    it('should output debug logs when DEBUG is set', () => {
      // Need to re-import to pick up new environment
      const { debug: freshDebug } = require('../../../src/lib/debug');
      
      freshDebug('Debug enabled message');
      expect(consoleSpy).toHaveBeenCalledWith('Debug enabled message');
    });

    it('should indicate debug logging is enabled', () => {
      const { isDebugLoggingEnabled: freshIsDebugEnabled } = require('../../../src/lib/debug');
      expect(freshIsDebugEnabled()).toBe(true);
    });
  });

  describe('multiple arguments', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should pass multiple arguments to console.debug', () => {
      const { debug: freshDebug } = require('../../../src/lib/debug');
      
      const obj = { test: 'value' };
      freshDebug('Message', obj, 123);
      expect(consoleSpy).toHaveBeenCalledWith('Message', obj, 123);
    });
  });
});