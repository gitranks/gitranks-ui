import { describe, expect, it } from 'vitest';

import { packageApiPath, parsePackageParams } from './package-params';

describe('parsePackageParams', () => {
  it('takes a plain and a scoped npm name, spelled as the page spells them', () => {
    expect(parsePackageParams('npm', ['react'])).toEqual({ registry: 'npm', name: 'react', canonical: true });
    expect(parsePackageParams('npm', ['@nebula', 'ui'])).toEqual({
      registry: 'npm',
      name: '@nebula/ui',
      canonical: true,
    });
  });

  it('takes a %40 for the @, marked for a redirect to the plain spelling', () => {
    expect(parsePackageParams('npm', ['%40nebula', 'ui'])).toEqual({
      registry: 'npm',
      name: '@nebula/ui',
      canonical: false,
    });
  });

  it('refuses another registry, any letter case of npm, a scope without @ and names npm refuses', () => {
    for (const [registry, segments] of [
      ['pypi', ['react']],
      ['NPM', ['react']],
      ['npm', []],
      ['npm', ['nebula', 'ui']],
      ['npm', ['@nebula', 'ui', 'x']],
      ['npm', ['.env']],
      ['npm', ['_private']],
      ['npm', ['node_modules']],
      ['npm', ['%E0%A4%A']],
      ['npm', ['has space']],
    ] as const) {
      expect(parsePackageParams(registry, segments), `${registry}/${segments.join('/')}`).toBeNull();
    }
  });
});

describe('packageApiPath', () => {
  it('names the route of a package, scoped or not', () => {
    expect(packageApiPath('react', 'dependents')).toBe('/api/packages/npm/react/dependents');
    expect(packageApiPath('@nebula/ui', 'refresh')).toBe('/api/packages/npm/@nebula/ui/refresh');
  });
});
