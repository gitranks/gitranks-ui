import { describe, expect, it } from 'vitest';

import { repoTabPath } from './repo-tabs';

describe('repoTabPath', () => {
  it('gives Overview the repository address and the other tabs their own segment', () => {
    expect(repoTabPath('vercel/next.js', 'overview')).toBe('/repo/vercel/next.js');
    expect(repoTabPath('vercel/next.js', 'used-by')).toBe('/repo/vercel/next.js/used-by');
    expect(repoTabPath('vercel/next.js', 'contributors')).toBe('/repo/vercel/next.js/contributors');
  });
});
