import { formatSpecName } from '@/lib/spec-formatting';

describe('formatSpecName', () => {
  test('removes numeric prefix and dash from spec names', () => {
    expect(formatSpecName('001-environments')).toBe('environments');
    expect(formatSpecName('003-vcs-providers')).toBe('vcs-providers');
    expect(formatSpecName('010-platform')).toBe('platform');
    expect(formatSpecName('009-projects')).toBe('projects');
  });

  test('handles specs without prefix', () => {
    expect(formatSpecName('no-prefix')).toBe('no-prefix');
    expect(formatSpecName('environments')).toBe('environments');
  });

  test('preserves spec names with numbers in other positions', () => {
    expect(formatSpecName('001-feature-v2')).toBe('feature-v2');
    expect(formatSpecName('100-test-123')).toBe('test-123');
  });
});
