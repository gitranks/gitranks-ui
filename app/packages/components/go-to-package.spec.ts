import { describe, expect, it } from 'vitest';

import { packageNameOfInput } from './go-to-package';

describe('packageNameOfInput', () => {
  it('takes an npm name, scoped or not, without the spaces around it', () => {
    expect(packageNameOfInput('react')).toBe('react');
    expect(packageNameOfInput('  @orbit/fetch ')).toBe('@orbit/fetch');
    expect(packageNameOfInput('JSONStream')).toBe('JSONStream');
  });

  it('refuses what npm would never take', () => {
    for (const input of [
      '',
      '   ',
      '.env',
      '_private',
      'orbit/fetch',
      '@orbit',
      'a b',
      'node_modules',
      'x'.repeat(215),
    ]) {
      expect(packageNameOfInput(input), input).toBeNull();
    }
  });
});
