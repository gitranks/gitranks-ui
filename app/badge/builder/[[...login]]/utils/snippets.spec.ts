import { describe, expect, it } from 'vitest';

import {
  badgeImageUrl,
  badgePath,
  entityPageUrl,
  htmlSnippet,
  markdownSnippet,
  type Snippet,
  snippetOf,
  withTheme,
} from './snippets';

const ORIGIN = 'https://gitranks.com';

const snippet = (auto: boolean, query = 'extra=month'): Snippet => ({
  imageUrl: badgeImageUrl(ORIGIN, 'repo', 'acme/fastqueue', 'rank', new URLSearchParams(query)),
  pageUrl: entityPageUrl(ORIGIN, 'repo', 'acme/fastqueue'),
  alt: 'acme/fastqueue on GitRanks: repo rank #41,206 · ↑312',
  auto,
});

describe('badge URLs', () => {
  it('encodes each part of the name', () => {
    expect(badgePath('repo', 'acme/fast.queue', 'rank')).toBe('/badge/repo/acme/fast.queue/rank.svg');
    expect(badgePath('user', 'octo-dev', 'rank-card', 'png')).toBe('/badge/user/octo-dev/rank-card.png');
    expect(badgeImageUrl(ORIGIN, 'org', 'nebula', 'org-card', new URLSearchParams())).toBe(
      'https://gitranks.com/badge/org/nebula/org-card.svg',
    );
  });

  it('pins one drawing with theme', () => {
    expect(withTheme('/badge/user/a/rank.svg', 'dark')).toBe('/badge/user/a/rank.svg?theme=dark');
    expect(withTheme('/badge/user/a/rank.svg?logo=0', 'light')).toBe('/badge/user/a/rank.svg?logo=0&theme=light');
  });

  it('links to the entity page, a country badge to the country tab', () => {
    expect(entityPageUrl(ORIGIN, 'repo', 'acme/fastqueue')).toBe('https://gitranks.com/repo/acme/fastqueue');
    expect(entityPageUrl(ORIGIN, 'org', 'nebula')).toBe('https://gitranks.com/org/nebula');
    expect(entityPageUrl(ORIGIN, 'user', 'octo-dev')).toBe('https://gitranks.com/profile/octo-dev');
    expect(entityPageUrl(ORIGIN, 'user', 'octo-dev', 'country')).toBe('https://gitranks.com/profile/octo-dev/country');
  });
});

describe('snippets', () => {
  it('writes Markdown with the plain image, escaping what would break the link', () => {
    expect(markdownSnippet(snippet(true))).toBe(
      '[![acme/fastqueue on GitRanks: repo rank #41,206 · ↑312](https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?extra=month)](https://gitranks.com/repo/acme/fastqueue)',
    );
    expect(markdownSnippet({ ...snippet(false, 'label=my+(best)+rank'), alt: 'a [b] c' })).toBe(
      '[![a \\[b\\] c](https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?label=my+%28best%29+rank)](https://gitranks.com/repo/acme/fastqueue)',
    );
  });

  it('wraps an Auto badge in <picture> with a light and a dark source', () => {
    expect(htmlSnippet(snippet(true))).toBe(
      [
        '<a href="https://gitranks.com/repo/acme/fastqueue">',
        '  <picture>',
        '    <source media="(prefers-color-scheme: dark)" srcset="https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?extra=month&amp;theme=dark">',
        '    <img src="https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?extra=month&amp;theme=light" alt="acme/fastqueue on GitRanks: repo rank #41,206 · ↑312">',
        '  </picture>',
        '</a>',
      ].join('\n'),
    );
  });

  it('writes a plain image for a fixed scheme, escaping attributes', () => {
    expect(htmlSnippet({ ...snippet(false, 'scheme=night&label=%22x%22'), alt: 'a "b" <c>' })).toBe(
      '<a href="https://gitranks.com/repo/acme/fastqueue"><img src="https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?scheme=night&amp;label=%22x%22" alt="a &quot;b&quot; &lt;c&gt;"></a>',
    );
  });

  it('gives the image URL alone', () => {
    expect(snippetOf('url', snippet(true))).toBe('https://gitranks.com/badge/repo/acme/fastqueue/rank.svg?extra=month');
    expect(snippetOf('markdown', snippet(true))).toBe(markdownSnippet(snippet(true)));
    expect(snippetOf('html', snippet(false))).toBe(htmlSnippet(snippet(false)));
  });
});
