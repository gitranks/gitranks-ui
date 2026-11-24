import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LearnPill } from './learn-pill';
import { RefChips } from './ref-chips';

describe('RefChips', () => {
  it('names the repo, then the issue and the pull request, each to GitHub in a new tab', () => {
    const html = renderToStaticMarkup(
      <RefChips repo="kelp-db/kelp" issue={1400} pr={{ number: 1419 }}>
        <LearnPill />
      </RefChips>,
    );
    expect(html).toContain(
      'href="https://github.com/kelp-db/kelp/issues/1400" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toContain('href="https://github.com/kelp-db/kelp/pull/1419"');
    expect(html.match(/<span class="sr-only">\(opens GitHub\)<\/span>/g)).toHaveLength(2);
    expect(
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ).toBe('kelp-db/kelp Issue #1400 ↗ (opens GitHub) PR #1419 ↗ (opens GitHub) Learn');
  });

  it("takes the pull request's own GitHub link when it has one, and nothing else", () => {
    const html = renderToStaticMarkup(
      <RefChips repo="kelp-db/kelp" issue={1} pr={{ number: 2, url: 'https://github.com/other/fork/pull/2' }} />,
    );
    expect(html).toContain('href="https://github.com/other/fork/pull/2"');
    const off = renderToStaticMarkup(
      <RefChips repo="kelp-db/kelp" issue={1} pr={{ number: 2, url: 'https://evil.example/pull/2' }} />,
    );
    expect(off).toContain('href="https://github.com/kelp-db/kelp/pull/2"');
  });

  it('draws plain text without a repo, or with a name that is not one', () => {
    for (const repo of [null, 'not a repo/../x']) {
      const html = renderToStaticMarkup(<RefChips repo={repo} issue={57} pr={{ number: 58 }} />);
      expect(html).not.toContain('<a ');
      expect(html).toContain('Issue #57');
    }
    // No name is made up for a missing repo: it is left out.
    expect(renderToStaticMarkup(<RefChips repo={null} issue={57} />)).not.toContain('a repo');
  });
});
