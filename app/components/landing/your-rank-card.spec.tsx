import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewerRankCard } from './__fixtures__/landing';
import type { RankCardData } from './rank-card.types';
import type { RankCardState } from './use-rank-card';

const { rankCard } = vi.hoisted(() => ({
  rankCard: { card: null as RankCardData | null, state: 'loading' as RankCardState },
}));

vi.mock('./use-rank-card', () => ({ useRankCard: () => rankCard }));

const { YourRankCard } = await import('./your-rank-card');

const render = (card: RankCardData | null, state: RankCardState) => {
  rankCard.card = card;
  rankCard.state = state;
  return renderToStaticMarkup(<YourRankCard login="octocat" />);
};

describe('YourRankCard', () => {
  beforeEach(() => {
    rankCard.card = null;
    rankCard.state = 'loading';
  });

  it('shows the login and the way to the profile at once, with placeholders while the ranks load', () => {
    const html = render(null, 'loading');

    expect(html).toContain('Your rank');
    expect(html).toContain('>octocat<');
    expect(html).toContain('href="/profile/octocat"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('aria-pressed');
  });

  it('tells an unranked visitor what a ranking needs', () => {
    const html = render(null, 'unranked');

    expect(html).toContain('You&#x27;re not ranked yet.');
    expect(html).toContain('href="/methodology"');
    expect(html).not.toContain('aria-busy');
  });

  it('points to the profile when the ranks could not be loaded', () => {
    const html = render(null, 'missing');

    expect(html).toContain('We couldn&#x27;t load your ranks right now.');
    expect(html).toContain('See them on your profile');
  });

  it('opens on the ranking with the best tier, with a tab for each ranking', () => {
    const html = render(viewerRankCard, 'ready');

    expect(html).toMatch(/aria-pressed="false"[^>]*>Stars</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Contributions</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Followers</);
    expect(html).toMatch(/#(<!-- -->)?8,210</);
    expect(html).toMatch(/of (<!-- -->)?1,101,747/);
    expect(html).toMatch(/410(<!-- -->)? (<!-- -->)?contribution stars/);
  });

  it('offers the badge of the ranking it shows, and the rest of the badges', () => {
    const html = render(viewerRankCard, 'ready');

    expect(html).toContain('Your badge');
    expect(html).toContain('Loading your badge');
    expect(html).toContain('Get this badge');
    expect(html).toContain('More badges');
  });

  it('says so when the visitor is not in the ranking it opens on, and offers the other badges alone', () => {
    const html = render(
      { ...viewerRankCard, rankings: { s: { position: null, previous: null, value: 2, rankedCount: 10, tier: null } } },
      'ready',
    );

    expect(html).toContain('Not ranked by stars yet.');
    expect(html).not.toContain('Your badge');
    expect(html).not.toContain('Get this badge');
    expect(html).toContain('More badges');
  });
});
