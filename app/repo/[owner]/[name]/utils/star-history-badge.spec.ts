import { describe, expect, it } from 'vitest';

import { getStarHistoryBadgePath, getStarHistoryBadgeSnippets } from './star-history-badge';

describe('star history badge', () => {
  it('points at the repository’s badge image', () => {
    expect(getStarHistoryBadgePath('octo-org', 'hello.world')).toBe(
      '/repo-badges/octo-org/hello.world/star-history.svg',
    );
  });

  it('links the badge to the repository page in Markdown and HTML', () => {
    expect(getStarHistoryBadgeSnippets('octo-org', 'hello.world')).toEqual({
      markdown:
        '[![Star history of octo-org/hello.world](https://gitranks.com/repo-badges/octo-org/hello.world/star-history.svg)](https://gitranks.com/repo/octo-org/hello.world)',
      html: '<a href="https://gitranks.com/repo/octo-org/hello.world"><img src="https://gitranks.com/repo-badges/octo-org/hello.world/star-history.svg" width="100%" alt="Star history of octo-org/hello.world"></a>',
    });
  });
});
