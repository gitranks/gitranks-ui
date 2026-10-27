import { describe, expect, it } from 'vitest';

import {
  getRankingPageOf,
  getRepoCacheTag,
  getRepoLanguageRankingPath,
  getRepoPath,
  isRankListed,
  parseRepoParams,
} from './repo-paths';

describe('parseRepoParams', () => {
  it('reads the owner and the name of a repository', () => {
    expect(parseRepoParams('vercel', 'next.js')).toEqual({ owner: 'vercel', name: 'next.js' });
  });

  it.each([
    ['a'.repeat(40), 'x'],
    ['-a', 'b'],
    ['a', '%25'],
    ['a', '%2F'],
    ['a', '%E0%A4%A'],
  ])('rejects %s/%s', (owner, name) => {
    expect(parseRepoParams(owner, name)).toBeNull();
  });
});

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
    expect(getRankingPageOf(5_100)).toBe(51);
  });

  it('knows which ranks sit on a listed page', () => {
    expect(isRankListed(5_100)).toBe(true);
    expect(isRankListed(5_101)).toBe(false);
  });

  it('sends a rank past the listed pages to the first page instead of a 404', () => {
    expect(getRankingPageOf(5_101)).toBe(1);
    expect(getRankingPageOf(2_000_000)).toBe(1);
  });

  it('tags a repository the same whatever the spelling', () => {
    expect(getRepoCacheTag('Facebook', 'React')).toBe(getRepoCacheTag('facebook', 'react'));
    expect(getRepoCacheTag('facebook', 'react')).toBe('repo:facebook/react');
  });
});
