import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepoLink } from './repo-link';

describe('RepoLink', () => {
  it('badges the owner avatar with the tier, ringed in the page background', () => {
    const html = renderToStaticMarkup(
      <RepoLink
        nameWithOwner="react/react"
        ownerAvatarUrl="https://avatars.example/u/1?v=4"
        tier={{ tier: 7, level: 5 }}
      />,
    );

    expect(html).toContain('aria-label="Supernova 5"');
    expect(html).toContain('ring-background');
  });

  it('shows no badge without a tier or without an avatar to sit on', () => {
    expect(renderToStaticMarkup(<RepoLink nameWithOwner="a/b" ownerAvatarUrl="https://x/1" />)).not.toContain(
      'aria-label=',
    );
    expect(renderToStaticMarkup(<RepoLink nameWithOwner="a/b" tier={{ tier: 2, level: 1 }} />)).not.toContain(
      'aria-label=',
    );
  });
});
