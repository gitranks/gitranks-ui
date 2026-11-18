import { describe, expect, it } from 'vitest';

import { packagePath, packageRankingPath } from './package-paths';

describe('packagePath', () => {
  it('keeps a plain name as it is', () => {
    expect(packagePath('react-resize-detector')).toBe('/package/npm/react-resize-detector');
  });

  it("keeps a scoped name's @ and slash, so the page has one address", () => {
    expect(packagePath('@orbit/fetch')).toBe('/package/npm/@orbit/fetch');
  });

  it('encodes what a URL path cannot hold as it is', () => {
    expect(packagePath('a b')).toBe('/package/npm/a%20b');
    expect(packagePath('@a/b?c')).toBe('/package/npm/@a/b%3Fc');
  });
});

describe('packageRankingPath', () => {
  it('is the ranking and its page, the first by default', () => {
    expect(packageRankingPath('downloads')).toBe('/packages/npm/downloads/1');
    expect(packageRankingPath('dependents-stars', 3)).toBe('/packages/npm/dependents-stars/3');
  });
});
