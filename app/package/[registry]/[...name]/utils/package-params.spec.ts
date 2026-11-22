import { describe, expect, it } from 'vitest';

import { packageApiPath, parseDecodedPackageParams, parsePackageParams } from './package-params';

describe('parsePackageParams', () => {
  it('takes a plain and a scoped npm name as a page gets them: each segment percent-encoded', () => {
    expect(parsePackageParams('npm', ['react'])).toEqual({ registry: 'npm', name: 'react' });
    // `/package/npm/@nebula/ui` and `/package/npm/%40nebula/ui` both reach the page as `%40nebula`.
    expect(parsePackageParams('npm', ['%40nebula', 'ui'])).toEqual({ registry: 'npm', name: '@nebula/ui' });
  });

  it('refuses another registry, any letter case of npm, a scope without @ and names npm refuses', () => {
    for (const [registry, segments] of [
      ['cargo', ['react']],
      ['pypi', ['zope', 'interface']],
      ['NPM', ['react']],
      ['npm', []],
      ['npm', ['nebula', 'ui']],
      ['npm', ['%40nebula', 'ui', 'x']],
      ['npm', ['.env']],
      ['npm', ['_private']],
      ['npm', ['node_modules']],
      ['npm', ['%E0%A4%A']],
      ['npm', ['has%20space']],
    ] as const) {
      expect(parsePackageParams(registry, segments), `${registry}/${segments.join('/')}`).toBeNull();
    }
  });
});

describe('parseDecodedPackageParams', () => {
  it('takes a route handler’s decoded params as they are, never decoding them again', () => {
    expect(parseDecodedPackageParams('npm', ['@nebula', 'ui'])).toEqual({ registry: 'npm', name: '@nebula/ui' });
    expect(parseDecodedPackageParams('npm', ['%40nebula', 'ui'])).toBeNull();
    expect(parseDecodedPackageParams('npm', ['nebula', 'ui'])).toBeNull();
  });
});

describe('packageApiPath', () => {
  it('names the route of a package, scoped or not', () => {
    expect(packageApiPath('npm', 'react', 'dependents')).toBe('/api/packages/npm/react/dependents');
    expect(packageApiPath('npm', '@nebula/ui', 'refresh')).toBe('/api/packages/npm/@nebula/ui/refresh');
  });
});
