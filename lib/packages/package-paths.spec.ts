import { describe, expect, it } from 'vitest';

import { isPackagePath, packageCacheTag, packagePath } from './package-paths';

describe('isPackagePath', () => {
  it.each([
    '/package/npm/react',
    '/package/npm/@types/node',
    '/package',
    '/packages',
    '/packages/',
    '/packages/npm',
    '/packages/npm/downloads/1',
    '/methodology/packages',
    '/methodology/packages/',
    '/repo/facebook/react/used-by',
    '/repo/facebook/react/used-by/',
    '/repo/facebook/react/contributors',
    // Spellings the router may read as the same page.
    '/%70ackage/npm/react',
    '//packages//npm',
    '/PACKAGE/npm/react',
    '/repo/facebook/react%2Fused-by',
    '/repo/facebook/react/%75sed-by',
    '/Methodology/Packages',
    '/package%',
    '/repo/a/b/used-by%',
  ])('covers %s', (path) => {
    expect(isPackagePath(path)).toBe(true);
  });

  it.each([
    '/',
    '/repo/facebook/react',
    '/repo/facebook/react/',
    '/repo/facebook/react/overview',
    '/repo/facebook/react/used-byx',
    '/repo/facebook/used-by',
    '/contributors',
    '/packagesx',
    '/packaged/x',
    '/methodology',
    '/methodology/repos',
    '/profile/packages',
    '/badge/package/npm/react/used-by.svg',
    '/api/me/packages/open',
  ])('leaves %s alone', (path) => {
    expect(isPackagePath(path)).toBe(false);
  });
});

describe('packageCacheTag', () => {
  it('is one lower-case tag per package, whatever the spelling', () => {
    expect(packageCacheTag('react')).toBe('package:npm/react');
    expect(packageCacheTag('@types/node')).toBe('package:npm/@types/node');
    expect(packageCacheTag('JSONStream')).toBe(packageCacheTag('jsonstream'));
    expect(packageCacheTag("It's(OK)!*")).toBe("package:npm/it's(ok)!*");
  });
});

describe('packagePath', () => {
  it("is the package's page, a scope's @ written as it is", () => {
    expect(packagePath('react')).toBe('/package/npm/react');
    expect(packagePath('@types/node')).toBe('/package/npm/@types/node');
    expect(packagePath("It's(OK)")).toBe("/package/npm/It's(OK)");
  });

  it('is a package path the proxy gates', () => {
    expect(isPackagePath(packagePath('@nebula/ui'))).toBe(true);
  });
});
