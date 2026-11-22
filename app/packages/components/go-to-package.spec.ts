import { describe, expect, it } from 'vitest';

import { packageNameOfInput } from './go-to-package';

describe('packageNameOfInput', () => {
  it('takes an npm name, scoped or not, without the spaces around it', () => {
    expect(packageNameOfInput('react', 'npm')).toBe('react');
    expect(packageNameOfInput('  @orbit/fetch ', 'npm')).toBe('@orbit/fetch');
    expect(packageNameOfInput('JSONStream', 'npm')).toBe('JSONStream');
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
      expect(packageNameOfInput(input, 'npm'), input).toBeNull();
    }
  });

  it("takes each registry's names by its own rule, in the spelling the site's addresses use", () => {
    expect(packageNameOfInput('Serde-JSON', 'crates')).toBe('serde_json');
    expect(packageNameOfInput('Laravel/Framework', 'packagist')).toBe('laravel/framework');
    expect(packageNameOfInput('Zope.Interface', 'pypi')).toBe('zope-interface');
    expect(packageNameOfInput('github.com/BurntSushi/toml', 'go')).toBe('github.com/BurntSushi/toml');
    expect(packageNameOfInput('org.slf4j:slf4j-api', 'maven')).toBe('org.slf4j:slf4j-api');
    expect(packageNameOfInput('provider', 'pub')).toBe('provider');
    expect(packageNameOfInput('Provider', 'pub')).toBeNull();
    expect(packageNameOfInput('laravel', 'packagist')).toBeNull();
    expect(packageNameOfInput('guava', 'maven')).toBeNull();
  });
});
