import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WhoBuildsItCard } from './who-builds-it-card';

vi.mock('next/image', () => ({ default: (props: { alt: string }) => <img alt={props.alt} /> }));

const repo = (name: string) => ({
  githubId: name,
  owner: name.split('/')[0],
  name: name.split('/')[1],
  nameWithOwner: name,
  ownerAvatarUrl: null,
  description: null,
  language: null,
  stars: 1_000,
  gainedThisMonth: null,
});
const siblings = [
  { shared: 13, share: 0.33, repo: repo('vercel/next.js') },
  { shared: 8, share: 0.21, repo: repo('react/react-native') },
  { shared: 6, share: 0.15, repo: repo('reactjs/react.dev') },
];
const builtBy = {
  accounts: 12,
  counts: [
    { tier: 7, count: 2 },
    { tier: 4, count: 10 },
  ],
  top: [{ login: 'ana', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4', tier: 7, level: 5 }],
};

describe('WhoBuildsItCard', () => {
  it('opens on Siblings with a toggle when both views exist', () => {
    const html = renderToStaticMarkup(
      <WhoBuildsItCard nameWithOwner="react/react" siblings={siblings} builtBy={builtBy} />,
    );

    expect(html).toContain('Who builds it');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toMatch(/A third of the people building react also commit to/);
    expect(html).toContain('href="/repo/vercel/next.js"');
  });

  it('shows Built by alone, without a toggle, under 3 siblings', () => {
    const html = renderToStaticMarkup(
      <WhoBuildsItCard nameWithOwner="react/react" siblings={siblings.slice(0, 2)} builtBy={builtBy} />,
    );

    expect(html).not.toContain('aria-pressed');
    expect(html).toContain('2 Legends and 10 Experts');
    expect(html).toContain('+11 more');
  });

  it('renders nothing with neither', () => {
    expect(renderToStaticMarkup(<WhoBuildsItCard nameWithOwner="a/b" siblings={[]} builtBy={null} />)).toBe('');
  });
});
