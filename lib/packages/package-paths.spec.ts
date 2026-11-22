import { describe, expect, it } from 'vitest';

import { packageCacheTag, packageMarkdownRewriteOf } from './package-paths';

describe('packageCacheTag', () => {
  it('is one lower-case tag per package, whatever the spelling', () => {
    expect(packageCacheTag('npm', 'react')).toBe('package:npm/react');
    expect(packageCacheTag('npm', '@types/node')).toBe('package:npm/@types/node');
    expect(packageCacheTag('npm', 'JSONStream')).toBe(packageCacheTag('npm', 'jsonstream'));
    expect(packageCacheTag('npm', "It's(OK)!*")).toBe("package:npm/it's(ok)!*");
  });
});

describe('packageMarkdownRewriteOf', () => {
  it("answers a package's facts.md from the packages API route, scoped or not", () => {
    expect(packageMarkdownRewriteOf('/package/npm/react/facts.md')).toBe('/api/packages/npm/react/facts.md');
    expect(packageMarkdownRewriteOf('/package/npm/@types/node/facts.md')).toBe(
      '/api/packages/npm/@types/node/facts.md',
    );
  });

  it('leaves every other path alone, a package named like the file included', () => {
    for (const path of [
      '/package/npm/react',
      '/package/npm/facts.md',
      '/package/npm/@acme/facts.md',
      '/package/npm/@acme/x/y/facts.md',
      '/package/npm/react/facts.md/',
      '/package/npm/react/facts.md/x',
      '/package/npm/react/facts.mdx',
      '/packages/npm/react/facts.md',
    ]) {
      expect(packageMarkdownRewriteOf(path), path).toBeNull();
    }
  });
});
