import { describe, expect, it } from 'vitest';

import { describeRemovedRepos } from './describe-removed-repos';

const repos = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `repo-${i}`, stargazers: i }));

describe('describeRemovedRepos', () => {
  it('names a short list whole, most-starred first', () => {
    const b = [
      { name: 'small', stargazers: 2 },
      { name: 'big', stargazers: 1200 },
    ];

    expect(describeRemovedRepos({ b })).toBe('big ★1,200; small ★2');
  });

  it('names ten repos of a long list and sums up the rest', () => {
    const text = describeRemovedRepos({ b: repos(14_578) });

    expect(text?.split('; ')).toHaveLength(11);
    expect(text).toMatch(/^repo-14577 ★14,577; repo-14576 ★14,576; /);
    expect(text).toMatch(/; repo-14568 ★14,568; and 14,568 more \(★106,106,028\)$/);
  });

  it('reads the totals of an entry that names only the top repos', () => {
    const b = [
      { name: 'top', stargazers: 50 },
      { name: 'next', stargazers: 40 },
    ];

    expect(describeRemovedRepos({ b, count: 1002, stars: 95 }, 2)).toBe('top ★50; next ★40; and 1,000 more (★5)');
  });

  it('leaves the stars out when the rest have none', () => {
    expect(describeRemovedRepos({ b: repos(3), count: 5, stars: 3 }, 3)).toBe(
      'repo-2 ★2; repo-1 ★1; repo-0 ★0; and 2 more',
    );
  });

  it('counts a repo without a star count as zero', () => {
    expect(describeRemovedRepos({ b: [{ name: 'quiet' }, { name: 'loud', stargazers: 3 }] })).toBe('loud ★3; quiet ★0');
  });

  it('describes nothing when no repo is listed', () => {
    expect(describeRemovedRepos({ b: [] })).toBeNull();
    expect(describeRemovedRepos({ b: null })).toBeNull();
  });
});
