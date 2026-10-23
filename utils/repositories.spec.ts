import { describe, expect, it } from 'vitest';

import { getContributionPrsUrl } from './repositories';

const query = (url: string) => new URL(url).searchParams.get('q');

describe('getContributionPrsUrl', () => {
  it('narrows the search to the merged PRs of that year', () => {
    const url = getContributionPrsUrl({
      url: 'https://github.com/macports/macports-ports',
      login: 'oytech',
      year: 2025,
    });

    expect(url.startsWith('https://github.com/macports/macports-ports/pulls?q=')).toBe(true);
    expect(query(url)).toBe('is:pr is:merged author:oytech created:2025-01-01T00:00:00Z..2025-12-31T23:59:59Z');
  });
});
