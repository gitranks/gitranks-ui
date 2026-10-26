import { describe, expect, it } from 'vitest';

import { getRankingPageOf, getRepoCacheTag, getRepoLanguageRankingPath, getRepoPath } from './repo-paths';

describe('repo paths', () => {
  it('encodes the owner and the name of a repository page', () => {
    expect(getRepoPath('vercel/next.js')).toBe('/repo/vercel/next.js');
    expect(getRepoPath('a-b/c d')).toBe('/repo/a-b/c%20d');
  });

  it('links a language ranking, or the ranking without a language', () => {
    expect(getRepoLanguageRankingPath('C#', 2)).toBe('/repos/language/C%23/2');
    expect(getRepoLanguageRankingPath(null)).toBe('/repos/no-language/1');
  });

  it('finds the ranking page of a rank', () => {
    expect(getRankingPageOf(1)).toBe(1);
    expect(getRankingPageOf(100)).toBe(1);
    expect(getRankingPageOf(101)).toBe(2);
  });

  it('tags a repository the same whatever the spelling', () => {
    expect(getRepoCacheTag('Facebook', 'React')).toBe(getRepoCacheTag('facebook', 'react'));
    expect(getRepoCacheTag('facebook', 'react')).toBe('repo:facebook/react');
  });
});
