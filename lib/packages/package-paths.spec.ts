import { describe, expect, it } from 'vitest';

import { isPackagePath, packageCacheTag, packageMarkdownRewriteOf } from './package-paths';

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

describe('packageMarkdownRewriteOf', () => {
  it("answers a package's facts.md from the packages API route, scoped or not, behind the packages gate", () => {
    expect(packageMarkdownRewriteOf('/package/npm/react/facts.md')).toBe('/api/packages/npm/react/facts.md');
    expect(packageMarkdownRewriteOf('/package/npm/@types/node/facts.md')).toBe(
      '/api/packages/npm/@types/node/facts.md',
    );
    expect(isPackagePath('/package/npm/react/facts.md')).toBe(true);
  });

  it('leaves every other path alone, a package named like the file included', () => {
    for (const path of [
      '/package/npm/react',
      '/package/npm/facts.md',
      '/package/npm/react/facts.md/x',
      '/package/npm/react/facts.mdx',
      '/packages/npm/react/facts.md',
    ]) {
      expect(packageMarkdownRewriteOf(path), path).toBeNull();
    }
  });
});
